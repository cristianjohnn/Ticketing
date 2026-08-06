---
description: How to deploy or update the Ticketing System on the NAS server
---

# Deploy / Update on NAS

// turbo-all

## First-Time Setup

1. SSH into your NAS:
```bash
ssh your-username@your-nas-ip
```

2. Navigate to where you want the project:
```bash
cd /volume1/docker   # or wherever you keep Docker projects
```

3. Clone the repo:
```bash
git clone https://github.com/Cristian-John/Ticketing.git
cd Ticketing
```

4. Create your `.env` file:
```bash
cp .env.example .env
# Edit if you want to change the port or admin password
```

5. Build and start:
```bash
sudo docker-compose up -d --build
```

6. Verify it's running:
```bash
sudo docker-compose ps
```

Access at: `http://your-nas-ip:3002`

---

## Updating (After Git Push)

1. SSH into the NAS:
```bash
ssh your-username@your-nas-ip
cd /volume1/docker/Ticketing   # your project path
```

2. Pull latest changes:
```bash
git pull origin main
# OR if using dev branch:
# git pull origin dev
```

3. Rebuild and restart:
```bash
sudo docker-compose up -d --build
```

> **NOTE:** You do NOT need to run `npm install` on the NAS. Docker handles all dependencies inside the container build.

> **NOTE:** Your database and uploads are stored in Docker volumes, so they persist across rebuilds.

---

## Useful Commands

```bash
# View logs
sudo docker-compose logs -f app

# Restart without rebuilding
sudo docker-compose restart

# Stop everything
sudo docker-compose down

# Stop AND remove volumes (⚠️ DELETES DATABASE)
sudo docker-compose down -v

# Check image sizes
sudo docker images | grep ticketing
```
