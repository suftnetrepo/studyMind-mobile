# StudyMind AI — Complete Deployment Guide
## From Zero to Production

**Stack:**
- Backend: FastAPI + Uvicorn (Python 3.12)
- Vector search: Typesense 0.25.2
- Database: Neon PostgreSQL (cloud, free)
- Server: DigitalOcean Droplet (Ubuntu 24.04)
- SSL: Let's Encrypt via Certbot
- Reverse proxy: Nginx
- Mobile: React Native (Expo)
- Domain: aismartlearner.com

**Production URLs:**
- API: https://api.aismartlearner.com
- Server IP: 159.89.13.126
- Backend repo: https://github.com/suftnetrepo/studymind-ai
- Mobile repo: https://github.com/suftnetrepo/studyMind-mobile

---

## PART 1 — Prerequisites (Do Once)

### 1.1 — Accounts you need
- GitHub (github.com)
- DigitalOcean (digitalocean.com)
- Neon (neon.tech) — free PostgreSQL
- OpenAI (platform.openai.com) — for AI features
- RevenueCat (revenuecat.com) — for subscriptions
- Domain registrar (webhostforasp.net) — aismartlearner.com

### 1.2 — SSH Key (on your Mac)
Check if you have one:
```bash
cat ~/.ssh/id_ed25519.pub
```
If nothing shows, generate one:
```bash
ssh-keygen -t ed25519 -C "studymind-deploy"
# Press Enter for all prompts
cat ~/.ssh/id_ed25519.pub
```
Copy the output — you'll need it when creating the server.

---

## PART 2 — Create the DigitalOcean Server

### 2.1 — Create Droplet
1. Log into **cloud.digitalocean.com**
2. Click **Create** → **Droplets**
3. Settings:
   - **Region**: Frankfurt (FRA1)
   - **Image**: Ubuntu 24.04 LTS x64
   - **Size**: Basic → Regular → **$12/month** (1 vCPU, 2GB RAM, 50GB SSD)
   - **Authentication**: SSH Key → paste your public key
   - **Hostname**: `studymind-prod`
4. Click **Create Droplet**
5. Note the IP address (e.g. `159.89.13.126`)

### 2.2 — SSH into the server
```bash
ssh -o StrictHostKeyChecking=no root@YOUR_SERVER_IP
# Enter your SSH key passphrase when prompted
```
You should see: `root@studymind-prod:~#`

---

## PART 3 — Server Setup

Run these commands on the server after SSHing in:

### 3.1 — Update system and install Docker
```bash
apt-get update -qq && apt-get upgrade -y -qq

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 3.2 — Add swap space (prevents out-of-memory crashes)
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```
You should see 2GB swap added.

### 3.3 — Clone the backend repo
```bash
mkdir -p /srv/studymind
cd /srv/studymind
git clone https://github.com/suftnetrepo/studymind-ai.git .
```

### 3.4 — Create the environment file
```bash
nano /srv/studymind/.env.prod
```
Paste this (NO spaces around = signs):
```
DATABASE_URL=postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-soft-credit-zaqq0vi0-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_EMBEDDING_DIMENSION=3072
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=rag-typesense-key
JWT_SECRET_KEY=YOUR_64_CHAR_HEX_KEY
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
APP_ENV=production
APP_LOG_LEVEL=INFO
CHUNK_SIZE=512
CHUNK_OVERLAP=64
TOP_K_RETRIEVAL=6
SIMILARITY_THRESHOLD=0.25
```

Generate JWT secret key (run on your Mac):
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Save: Ctrl+X → Y → Enter

### 3.5 — Create docker-compose.prod.yml
```bash
cat > /srv/studymind/docker-compose.prod.yml << 'EOF'
services:

  typesense:
    image: typesense/typesense:0.25.2
    container_name: studymind_typesense
    restart: unless-stopped
    ports:
      - "8108:8108"
    volumes:
      - typesense_data:/data
    command: --data-dir=/data --api-key=rag-typesense-key --enable-cors

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: studymind_api
    restart: unless-stopped
    ports:
      - "8000:8000"
    env_file: .env.prod
    depends_on:
      - typesense
    volumes:
      - uploads_data:/app/uploads

volumes:
  typesense_data:
  uploads_data:
EOF
```

### 3.6 — Start the services
```bash
cd /srv/studymind
docker compose -f docker-compose.prod.yml up -d --build
```
This takes 3–5 minutes first time. Wait then check:
```bash
sleep 20
curl http://localhost:8000/api/health
```
Expected:
```json
{"status":"ok","version":"1.0.0","services":{"postgresql":true,"typesense":true}}
```

**⚠️ IMPORTANT — Common issue:**
If typesense shows `false`, the API started before Typesense was ready.
Fix: restart just the API:
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
sleep 20
curl http://localhost:8000/api/health
```

---

## PART 4 — Domain and SSL Setup

### 4.1 — Buy a domain
- Buy from any registrar (Namecheap, GoDaddy, webhostforasp)
- For StudyMind: `aismartlearner.com` from webhostforasp

### 4.2 — Point domain to server
Contact your registrar support or use their DNS panel to add:
```
Type:  A
Host:  api
Value: YOUR_SERVER_IP (159.89.13.126)
TTL:   300
```
This creates `api.aismartlearner.com` → your server.

### 4.3 — Verify DNS propagation (on your Mac)
```bash
dig api.aismartlearner.com +short
```
Wait until it returns your server IP. Can take 5–30 minutes.

### 4.4 — Install Nginx and Certbot (on the server)
```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

### 4.5 — Configure Nginx
```bash
cat > /etc/nginx/sites-available/studymind << 'EOF'
server {
    listen 80;
    server_name api.aismartlearner.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass         http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
EOF

ln -s /etc/nginx/sites-available/studymind /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 4.6 — Get SSL certificate
```bash
certbot --nginx -d api.aismartlearner.com \
  --non-interactive --agree-tos \
  -m YOUR_EMAIL@domain.com
```
Expected output: `Congratulations! You have successfully enabled HTTPS`

SSL auto-renews every 90 days via a cron job Certbot installs automatically.

### 4.7 — Verify HTTPS (on your Mac)
```bash
curl https://api.aismartlearner.com/api/health
```
Expected:
```json
{"status":"ok","version":"1.0.0","services":{"postgresql":true,"typesense":true}}
```

---

## PART 5 — Upload Study Documents

After the server is running, upload course materials:

```bash
# Get auth token
TOKEN=$(curl -s -X POST https://api.aismartlearner.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lecturer@demo.ac.uk","password":"Lecturer1234"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Upload a single file
curl -X POST \
  "https://api.aismartlearner.com/api/modules/YOUR_MODULE_ID/documents?visibility=class" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/file.pdf"

# Bulk upload all PDFs from a folder
for f in ~/Downloads/your-documents/*; do
  ext=$(echo "${f##*.}" | tr '[:upper:]' '[:lower:]')
  if [[ "$ext" =~ ^(pdf|docx|txt|md|csv)$ ]]; then
    echo "Uploading: $(basename $f)"
    curl -s -X POST \
      "https://api.aismartlearner.com/api/modules/YOUR_MODULE_ID/documents?visibility=class" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@$f" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))"
  fi
done
```

---

## PART 6 — Mobile App Setup

### 6.1 — Update API URL
In `~/Downloads/studymind-rn/src/services/api.ts`:
```typescript
export const API_BASE = process.env.EXPO_PUBLIC_API_URL 
  || 'https://api.aismartlearner.com'
```

### 6.2 — Local development
For testing on your Mac (Expo Go or dev build):
```bash
# Create .env.local in studymind-rn/
echo "EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:8000" > .env.local

# Start local backend
cd ~/dev/studymind-final
source .venv/bin/activate
colima start
export DOCKER_HOST="unix:///Users/appdev/.colima/default/docker.sock"
docker compose up -d
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload

# Start Expo
cd ~/Downloads/studymind-rn
npx expo start
```

### 6.3 — Production build (TestFlight)
```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
```
Submit to TestFlight via App Store Connect.

---

## PART 7 — Daily Operations

### Check server status
```bash
ssh root@159.89.13.126
docker compose -f /srv/studymind/docker-compose.prod.yml ps
```

### View logs
```bash
# API logs
docker logs studymind_api --tail=50 -f

# Typesense logs
docker logs studymind_typesense --tail=20

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Monitor resources
```bash
htop              # CPU + RAM usage
df -h             # Disk usage
docker stats      # Container resource usage
free -h           # Memory + swap
```

### Deploy new code
```bash
ssh root@159.89.13.126
cd /srv/studymind
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Backup database
```bash
# On the server — manual backup
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /srv/backups

# Typesense — export all chunks
curl -s "http://localhost:8108/collections/document_chunks/documents/export" \
  -H "X-TYPESENSE-API-KEY: rag-typesense-key" \
  | gzip > /srv/backups/typesense_$DATE.jsonl.gz

echo "Backup saved: /srv/backups/typesense_$DATE.jsonl.gz"
```

### Set up automated daily backups
```bash
crontab -e
# Add this line:
0 2 * * * cd /srv/studymind && curl -s "http://localhost:8108/collections/document_chunks/documents/export" -H "X-TYPESENSE-API-KEY: rag-typesense-key" | gzip > /srv/backups/typesense_$(date +\%Y\%m\%d).jsonl.gz
```

---

## PART 8 — Troubleshooting

### Problem: Can't SSH into server
```bash
# Try with explicit key
ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no root@159.89.13.126
```

### Problem: Health check shows typesense: false
```bash
# Check Typesense is actually running
curl http://localhost:8108/health -H "X-TYPESENSE-API-KEY: rag-typesense-key"

# Check API logs for the real error
docker logs studymind_api 2>&1 | grep -E "typesense|error|Error"

# Most common fix — restart both services
docker compose -f /srv/studymind/docker-compose.prod.yml down
docker compose -f /srv/studymind/docker-compose.prod.yml up -d
sleep 20
curl http://localhost:8000/api/health
```

### Problem: 401 Unauthorized on API calls
```bash
# Check TYPESENSE_API_KEY in .env.prod has NO spaces around =
grep TYPESENSE_API_KEY /srv/studymind/.env.prod | cat -A
# Should show: TYPESENSE_API_KEY=rag-typesense-key$
# NOT: TYPESENSE_API_KEY =rag-typesense-key$  ← space before = causes 401
```

### Problem: Connection refused to Typesense from API
```bash
# Inside Docker, Typesense is NOT at localhost — it's at the service name
grep TYPESENSE_HOST /srv/studymind/.env.prod
# Must show: TYPESENSE_HOST=typesense
# NOT: TYPESENSE_HOST=localhost
```

### Problem: API container starts but crashes
```bash
docker logs studymind_api --tail=30
# Look for Python import errors or missing env vars
```

### Problem: Out of memory (OOM)
```bash
free -h
# If available memory < 200MB, restart API to free memory
docker restart studymind_api
# Long term: upgrade droplet to $24/month (4GB RAM)
```

### Problem: SSL certificate expired
```bash
# Force renewal
certbot renew --force-renewal
systemctl restart nginx
# Check new expiry
certbot certificates
```

### Problem: Disk full
```bash
df -h
# Clean Docker images
docker image prune -f
docker system prune -f
# Check log sizes
du -sh /var/log/nginx/
# Truncate large logs
> /var/log/nginx/access.log
```

### Problem: Domain not resolving
```bash
# Check DNS propagation
dig api.aismartlearner.com +short
# Should return: 159.89.13.126
# If not, DNS hasn't propagated yet — wait 30 minutes
```

### Problem: Mobile app can't connect to API
```bash
# Test from your Mac
curl https://api.aismartlearner.com/api/health

# Check Nginx is running
ssh root@159.89.13.126
systemctl status nginx

# Check API is running
docker ps | grep studymind_api
```

### Problem: Document upload fails
```bash
# Check uploads volume exists
docker volume ls | grep uploads

# Check disk space
df -h

# Check API logs during upload
docker logs studymind_api --tail=20 -f
# Then try the upload in the app
```

---

## PART 9 — Scaling (When You Need It)

### Upgrade server (DigitalOcean console)
- Go to droplet → **Resize**
- $12/month → $24/month (2 vCPU, 4GB RAM) when RAM hits 80%
- $24/month → $48/month when you have 1,000+ active users
- Takes 2–3 minutes, zero data loss

### Increase Uvicorn workers
In `Dockerfile`, change:
```bash
# Current (2 workers for 2GB RAM)
CMD uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2

# After upgrade to 4GB RAM
CMD uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4
```
Then redeploy:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## PART 10 — Key Files and Locations

### On the server (159.89.13.126)
```
/srv/studymind/                    ← main app directory
/srv/studymind/.env.prod           ← environment variables (secrets)
/srv/studymind/docker-compose.prod.yml ← Docker services config
/srv/studymind/Dockerfile          ← how the API image is built
/etc/nginx/sites-available/studymind ← Nginx config
/etc/letsencrypt/live/api.aismartlearner.com/ ← SSL certificates
/srv/backups/                      ← database backups
```

### On your Mac
```
~/dev/studymind-final/             ← backend source code
~/Downloads/studymind-rn/          ← mobile app source code
~/Downloads/studymind-rn/src/services/api.ts ← API URL config
```

### Key environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `TYPESENSE_API_KEY` | Must match between API and Typesense |
| `TYPESENSE_HOST` | Must be `typesense` (Docker service name) |
| `JWT_SECRET_KEY` | Signs auth tokens — never change in production |

---

## PART 11 — Monthly Costs

| Service | Cost |
|---|---|
| DigitalOcean droplet (2GB) | $12/month |
| Neon PostgreSQL | $0/month (free tier) |
| aismartlearner.com domain | ~$1.15/month ($13.88/year) |
| OpenAI API (usage-based) | ~$15-30/month depending on users |
| **Total** | **~$28-43/month (£22-34/month)** |

**Break even:** 2-3 Pro subscribers at £14.99/month covers all costs.

---

## PART 12 — Emergency Contacts and Credentials

### Server
- IP: `159.89.13.126`
- User: `root`
- SSH: `ssh root@159.89.13.126`

### Services
- DigitalOcean: cloud.digitalocean.com
- Neon: console.neon.tech (project: studymind-prod)
- Domain: webhostforasp.net (aismartlearner.com)
- GitHub backend: github.com/suftnetrepo/studymind-ai
- GitHub mobile: github.com/suftnetrepo/studyMind-mobile

### Demo credentials (development only)
- Admin: admin@demo.ac.uk / Admin1234
- Lecturer: lecturer@demo.ac.uk / Lecturer1234
- Student: student@demo.ac.uk / Student1234

### API endpoints
- Health: `GET https://api.aismartlearner.com/api/health`
- Login: `POST https://api.aismartlearner.com/api/auth/login`
- Docs: `https://api.aismartlearner.com/docs` (Swagger UI)