# Asteroid Panel

This is a standalone web admin panel for managing multiple Asteroid Container Server instances. It is built with Node.js, Express, Bootstrap 5, and EJS templates.

## Features
- Secure panel admin login (separate from container admin keys)
- Add, edit, and remove container instances (display name, API URL, admin key)
- View and manage all containers from a single dashboard
- View instance info, edit/reload config, and manage files via the container API
- All actions are performed through the container's HTTP API (never direct file access)

## Setup
1. `cd panel`
2. `npm install`
3. `npm start`
4. Open [http://localhost:4000](http://localhost:4000) in your browser
5. Set a panel admin key on first launch
6. Add your container instances (display name, API URL, admin key)

## Security
- The panel admin key is required for all access
- Container admin keys are stored only in the panel config (JSON file)
- All API calls are proxied through the panel and require the correct admin key for each instance

## Notes
- This panel is a separate Node.js project and should be run independently
- You can deploy the panel anywhere that can reach your container APIs
- For best security, use HTTPS and strong admin keys for both the panel and your containers
