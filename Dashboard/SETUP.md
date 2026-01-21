# Dashboard Setup Guide

This guide will help you connect the Guardian IDS Dashboard to the backend.

## Prerequisites

- Node.js installed
- Backend server running on `http://localhost:3000`
- MongoDB database configured and running

## Setup Steps

### 1. Install Dependencies

```bash
cd Dashboard
npm install
```

### 2. Environment Configuration

The `.env.local` file has been created with the following configuration:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

If your backend is running on a different port or host, update these values accordingly.

### 3. Setup Admin User (Backend)

Before you can log in, you need to create an admin user in the backend:

```bash
cd ../Backend
node setup-admin.js
```

This will create a default admin user:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change this password after your first login!

### 4. Start the Backend Server

Make sure the backend server is running:

```bash
cd Backend
npm start
```

The backend should be running on `http://localhost:3000`

### 5. Start the Dashboard

```bash
cd Dashboard
npm run dev
```

The dashboard will be available at `http://localhost:3002`

## Usage

### Login

1. Navigate to `http://localhost:3002`
2. You'll be automatically redirected to the login page
3. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
4. Click "Sign In"

### Dashboard Features

Once logged in, you'll see:

- **Real-time Statistics**: Total attacks, attack rate, threat level, and total flows
- **Attack Timeline**: Visual representation of attacks over time
- **Attack Type Breakdown**: Pie chart showing distribution of attack types
- **Geographic Intelligence**: Top attacking countries with flags
- **IP Intelligence**: Top attacking IPs with severity scores
- **Live Attack Stream**: Real-time feed of incoming attacks
- **WebSocket Connection**: Live indicator showing connection status

### Time Range Selection

Use the dropdown in the top-right corner to filter data by time range:
- Last Hour
- Last 6 Hours
- Last 24 Hours (default)
- Last 7 Days
- Last 30 Days

### Logout

Click the logout icon in the sidebar (bottom section) to sign out.

## API Endpoints Used

The dashboard connects to the following backend endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/stats?time_range={range}` - Dashboard statistics
- WebSocket connection for real-time updates

## WebSocket Events

The dashboard listens to the following WebSocket events:

- `connected` - Connection established
- `new_attack` - New attack detected
- `stats_update` - Statistics updated

## Troubleshooting

### Cannot connect to backend

1. Ensure the backend server is running
2. Check that the backend URL in `.env.local` is correct
3. Verify CORS is properly configured in the backend

### Login fails

1. Ensure you've run the `setup-admin.js` script
2. Check that MongoDB is running and connected
3. Verify the JWT_SECRET is set in the backend `.env` file

### No data showing

1. Make sure there's data in the MongoDB database
2. Check the browser console for errors
3. Verify the authentication token is valid

### WebSocket not connecting

1. Check that Socket.IO is properly initialized in the backend
2. Verify the WebSocket URL in `.env.local`
3. Check browser console for connection errors

## Development Notes

- The dashboard uses Next.js 16 with React 19
- Socket.IO client is used for WebSocket connections
- Authentication tokens are stored in localStorage
- The dashboard auto-refreshes data every 30 seconds

## Security Notes

- Always change the default admin password
- JWT tokens expire after 24 hours
- Use HTTPS in production
- Keep your `.env.local` file secure and never commit it to version control
