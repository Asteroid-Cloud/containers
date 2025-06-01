# Asteroid Containers & Panel

Asteroid is a modular, secure, and extensible file container server with a modern web-based admin panel. This repository contains two main projects:

- **Container** (`/`): The Node.js file container server with role-based authentication, permissions, and a REST API.
- **Panel** (`/panel`): A standalone web admin panel (Node.js + Bootstrap 5) for managing multiple container instances from a single UI.

---

## 📦 Container Server

The container server is a Node.js application for secure file storage, upload, and management. It features:
- Role-based authentication (admin, user, premium, guest, etc.)
- Centralized configuration (`container.config.json`)
- Directory and file-level permission enforcement
- File upload, download, delete, and listing APIs
- Admin endpoints for live config editing and reload
- CORS domain control and public file sharing (with fine-grained control)

### Basic Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Edit `container.config.json` to set up roles, permissions, limits, and public file access as needed.
3. Start the server:
   ```sh
   npm start
   ```

---

## 🖥️ Panel (Web Admin)

The panel is a separate Node.js project for managing multiple Asteroid container instances from one dashboard. It features:
- Secure panel admin login (separate from container admin keys)
- Add, edit, and remove container instances (display name, API URL, admin key)
- View instance info, edit/reload config, and manage files via the container API
- File manager with directory navigation, upload, delete, and rename
- All actions are performed through the container's HTTP API (never direct file access)

### Basic Setup
1. Enter the `panel` directory:
   ```sh
   cd panel
   npm install
   npm start
   ```
2. Open [http://localhost:4000](http://localhost:4000) in your browser.
3. Set a panel admin key on first launch.
4. Add your container instances (display name, API URL, admin key) via the UI.

---

## Notes
- The container and panel are independent Node.js projects. Run them separately.
- The panel never accesses files directly; all management is via the container's API.
- For full documentation, see the `help/` directory in the root project.

---

**Asteroid is designed for teams, organizations, or individuals who need secure, auditable, and flexible file management with modern web-based administration.**
