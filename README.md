<div align="center">

# 🍴 Nexus Of Delights - Food Stall POS System

![GitHub stars](https://img.shields.io/github/stars/harishc-dev/Restaurant-billing-app?style=social)
![GitHub forks](https://img.shields.io/github/forks/harishc-dev/Restaurant-billing-app?style=social)
![GitHub issues](https://img.shields.io/github/issues/harishc-dev/Restaurant-billing-app)
![GitHub license](https://img.shields.io/github/license/harishc-dev/Restaurant-billing-app)

### 🎯 A Real-Time Point of Sale System for School Event Food Stalls

**Manage orders, track kitchen operations, and analyze sales with a stunning neon-themed interface**

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-010101?logo=socket.io&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-Templating-B4CA65?logo=ejs&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## 📸 Preview

<div align="center">
  
<img width="408" height="551" alt="image" src="https://github.com/user-attachments/assets/13ed29ab-3e30-4fcb-87c3-953f8f9a9cf2" />
<img width="410" height="555" alt="image" src="https://github.com/user-attachments/assets/dbf6102e-d8a2-4a28-bb78-37722a29cf4d" />
<img width="406" height="553" alt="image" src="https://github.com/user-attachments/assets/534b2645-c748-4140-bb97-d719769819a3" />
<img width="406" height="547" alt="image" src="https://github.com/user-attachments/assets/36d977fb-dd47-4782-a1ae-87743a170353" />
<img width="408" height="553" alt="image" src="https://github.com/user-attachments/assets/3dd1e343-d6e0-4eeb-94c5-e8364adb940d" />
<img width="408" height="553" alt="image" src="https://github.com/user-attachments/assets/6860b301-7d83-4131-863e-7fb667f88201" />

</div>

---

## 💡 What is Nexus Of Delights?

**Nexus Of Delights** is a full-featured Point of Sale (POS) system designed specifically for school event food stalls. It provides **real-time order management**, **kitchen coordination**, and **comprehensive sales analytics** with a stunning cyberpunk-inspired neon interface.

### 🎯 Core Purpose

- **⚡ Real-Time Orders** - Instant order transmission from billing to kitchen via WebSockets
- **👥 Multi-Group Support** - Separate operations for Boys and Girls groups
- **🎫 Unique Tokens** - 6-digit token system (B/G prefix) for order tracking
- **📊 Live Analytics** - Real-time statistics and revenue tracking
- **🍽️ Combo Support** - Smart combo mechanism (billing sees combo, kitchen sees individual items)
- **📱 Mobile-First** - Fully responsive design optimized for phones and tablets
- **🔐 Secure Access** - Role-based authentication (Admin, Boys, Girls)

---

## ✨ Key Features

### 🧾 **Billing System**
- **Quick item selection** with grid layout and visual cards
- **Real-time availability** - Items marked unavailable by kitchen are auto-disabled
- **Smart cart management** - Add, remove, adjust quantities on the fly
- **Token preview** - Show customers their order token before checkout
- **Combo pricing** - Display combo name and price, but kitchen receives individual items
- **Item images** - Visual menu with photo support for each dish

### 🍳 **Kitchen Dashboard**
- **Live order queue** - New orders appear instantly via WebSockets
- **Order status tracking** - Mark orders as Processing → Ready → Completed
- **Availability management** - Quickly mark items as unavailable
- **Real-time sync** - Changes reflect immediately across all billing terminals
- **Order breakdown** - See component dishes for combos (not combo names)
- **Oldest-first display** - Orders organized by creation time

### 📈 **Admin & Analytics**
- **Comprehensive statistics** - Revenue, cost, profit per item
- **Group-wise breakdown** - Boys vs Girls sales comparison with pie charts
- **Order history** - Filter by status, group, and time
- **CSV export** - Download detailed order reports
- **Real-time dashboard** - Live updates as orders are completed
- **Cost tracking** - Automatic profit calculation based on item costs

### 💬 **Messaging System**
- **Group communication** - Billing ↔ Kitchen messaging per group
- **Admin broadcasts** - Send messages to both groups simultaneously
- **Real-time delivery** - Messages appear instantly without refresh
- **Visual indicators** - Unread message counts and color-coded badges
- **Persistent history** - All messages saved and retrievable

### 🔄 **Token Management**
- **Sequential tokens** - B100000+ for Boys, G100000+ for Girls
- **Non-reuse policy** - Tokens never repeat during runtime
- **Persistent tracking** - Reserved and used tokens saved to disk
- **Reset functionality** - Admin can reset Boys/Girls tokens independently
- **Preview system** - Token displayed before order confirmation

### 🎨 **User Experience**
- **Neon cyberpunk theme** - Glowing borders, smooth gradients, dark mode
- **Responsive design** - Works perfectly on phones, tablets, desktops
- **Smooth animations** - Transitions and hover effects throughout
- **Toast notifications** - Non-intrusive status messages
- **Intuitive navigation** - Clear visual hierarchy and familiar patterns
- **Safe area support** - Optimized for iPhone notches and Android navigation bars

---

## 🛠️ Built With

| Category | Technologies |
|----------|-------------|
| **Backend** | Node.js 18+, Express.js 4.x, Socket.IO |
| **Frontend** | EJS Templates, Tailwind CSS (CDN) |
| **Database** | JSON flat-file storage (orders, tokens, messages, availability) |
| **Real-time** | Socket.IO WebSockets for instant updates |
| **Session** | express-session with in-memory store |
| **Architecture** | MVC pattern, RESTful API + WebSocket events |

---

## 🚀 Getting Started

### Prerequisites

```bash
Node.js v18 or higher
npm or yarn
Git
```

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/harishc-dev/Restaurant-billing-app.git
   cd Restaurant-billing-app/code
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (Optional)
   
   Create a `.env` file:
   ```env
   PORT=3000
   SESSION_SECRET=your-secret-key
   NODE_ENV=production
   ```

4. **Run the application**
   ```bash
   npm start
   ```

5. **Access the application**
   
   Open your browser to `http://localhost:3000`

---

## 🔐 Default Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| **Admin** | `ADMIN` | `pass` | Full access: Statistics, History, Messages, Reset |
| **Boys Group** | `BOYS` | `pass` | Billing & Kitchen for Server 1 |
| **Girls Group** | `GIRLS` | `pass` | Billing & Kitchen for Server 2 |

### Reset System Passwords
- **Token Reset**: `pass` (reset Boys or Girls tokens independently)
- **Full Data Reset**: `pass` (clears all orders, messages, availability, tokens)

---

## 📂 Project Structure

```
Baba-Stall/
├── code/
│   ├── src/
│   │   ├── server.js       # Main Express app & Socket.IO setup
│   │   ├── storage.js      # JSON file storage layer
│   │   └── items.js        # Menu items loader & normalizer
│   ├── views/
│   │   ├── billing.ejs     # Billing interface
│   │   ├── kitchen.ejs     # Kitchen dashboard
│   │   ├── history.ejs     # Order history (admin)
│   │   ├── stats.ejs       # Statistics page (admin)
│   │   ├── menu.ejs        # Main menu/dashboard
│   │   ├── reset.ejs       # Reset system page (admin)
│   │   ├── login.ejs       # Authentication page
│   │   └── partials/       # Reusable header/footer
│   ├── public/
│   │   ├── js/
│   │   │   ├── billing.js      # Billing client logic
│   │   │   ├── kitchen.js      # Kitchen client logic
│   │   │   ├── stats.js        # Statistics visualizations
│   │   │   └── admin-items.js  # Admin item management
│   │   ├── css/
│   │   │   └── custom.css      # Neon theme styles
│   │   └── img/
│   │       ├── logo.png        # App logo
│   │       └── items/          # Menu item photos
│   ├── data/
│   │   ├── items.json          # Menu items & combos
│   │   ├── orders.json         # Persistent orders
│   │   ├── reserved-tokens.json
│   │   ├── token-state.json
│   │   ├── availability.json
│   │   └── messages.json
│   └── package.json
└── README.md
```

---

## 🎯 Core Workflows

### 📱 Billing Workflow
1. User logs in as **BOYS** or **GIRLS**
2. Selects items from the menu (checks availability)
3. Builds cart with quantities
4. Clicks **Proceed** → Token is previewed
5. Clicks **Checkout** → Order sent to kitchen instantly
6. Token displayed for customer to collect order

### 🍳 Kitchen Workflow
1. Kitchen staff logs in as **BOYS** or **GIRLS**
2. New orders appear in real-time at the bottom
3. Staff marks order as **Processing** (turns blue)
4. When ready, marks as **Ready** (turns yellow/orange)
5. When collected, marks as **Completed** (disappears from queue)
6. Can mark items as unavailable to prevent billing

### 📊 Admin Workflow
1. Admin logs in as **ADMIN**
2. Access to:
   - **Statistics** - Per-item sales with Boys vs Girls breakdown
   - **Order History** - All orders with filters and CSV export
   - **Messages** - View all group messages, broadcast to everyone
   - **Reset System** - Reset tokens or all data

---

## 🍔 Combo System

Combos are a powerful feature that simplifies billing while maintaining accurate kitchen operations:

### How It Works
- **Billing sees**: "Dream Combo - ₹120" with combo photo
- **Kitchen sees**: "Brownie ×1, Lemon Juice ×1, Samosa ×1"
- **History shows**: Individual component dishes
- **Statistics track**: Individual dish counts (no combo entry)

### Defining Combos in `data/items.json`

```json
{
  "id": "dream-combo",
  "name": "Dream Combo",
  "price": 120,
  "cost": 60,
  "image": "dream-combo.png",
  "combo": true,
  "components": [
    { "id": "brownie", "qty": 1 },
    { "id": "lemon-juice", "qty": 1 },
    { "id": "samosa", "qty": 1 }
  ]
}
```

### Benefits
- Easier pricing for customers (single combo price)
- Kitchen sees exactly what to prepare
- Accurate statistics per actual dish
- Flexible combo pricing (can differ from sum of parts)

---

## 📊 Features Showcase

| Feature | Description |
|---------|-------------|
| **🎫 Token System** | Unique B/G prefixed tokens never repeat |
| **⚡ Real-time Sync** | Orders, availability, messages update instantly |
| **🧮 Smart Stats** | Revenue, cost, profit with visual pie charts |
| **💬 Messaging** | Group-specific and broadcast communication |
| **🍽️ Combo Logic** | Billing-friendly combos, kitchen-ready expansion |
| **🔄 Reset Control** | Independent token reset per group |
| **📱 Mobile UI** | Touch-optimized, responsive, safe-area aware |
| **🎨 Neon Theme** | Cyberpunk aesthetics with glowing effects |

---

## 📱 Android App with Capacitor

This web application can be easily converted into a **native Android app** using **Capacitor**, providing a seamless mobile experience:

### Why Capacitor?

- **🚀 Native Look & Feel** - Runs as a true Android app with app icon and splash screen
- **📲 Hardware Access** - Camera, notifications, storage, and more
- **⚡ Performance** - Uses the hosted web app but feels like native
- **🔄 Auto-updates** - Changes to the web app reflect immediately
- **💾 Offline Support** - Can implement local caching strategies
- **📦 Easy Deployment** - Build APK/AAB for Google Play Store

### Quick Capacitor Setup

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "Nexus Of Delights" com.harishc.babastall

# Add Android platform
npm install @capacitor/android
npx cap add android

# Configure app to point to hosted URL
# In capacitor.config.json:
{
  "server": {
    "url": "https://your-hosted-app.com",
    "cleartext": true
  }
}

# Build and run
npx cap sync
npx cap open android
```

### Native Features You Can Add

- **Push Notifications** - Alert kitchen when new orders arrive
- **Biometric Auth** - Fingerprint login for staff
- **Offline Mode** - Cache menu items and queue orders
- **Camera** - Scan QR codes for quick item lookup
- **Vibration** - Haptic feedback for order completion
- **Status Bar** - Customize colors to match neon theme

### Deployment Options

1. **Internal Testing** - Direct APK distribution to staff
2. **Google Play** - Publish on Play Store for wider access
3. **Enterprise** - Deploy via MDM for school devices

---

## 🗺️ Roadmap

Future enhancements planned:

- [ ] **Multi-event support** - Switch between different events/menus
- [ ] **QR code ordering** - Customers scan QR to order directly
- [ ] **Receipt printing** - Thermal printer integration
- [ ] **Inventory management** - Track ingredient stock levels
- [ ] **Employee timesheets** - Track staff shifts and hours
- [ ] **Multi-language support** - Hindi, Tamil, Telugu, etc.
- [ ] **Dark/Light theme toggle** - User preference support
- [ ] **Advanced analytics** - Peak hours, popular combos, trends
- [ ] **Cloud database** - Migrate to MongoDB for multi-instance scaling
- [ ] **Payment integration** - UPI, cards, digital wallets

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Harish C**

[![Portfolio](https://img.shields.io/badge/Portfolio-harishc--dev.me-00D9FF?style=flat-square&logo=google-chrome&logoColor=white)](https://harishc-dev.me)
[![GitHub](https://img.shields.io/badge/GitHub-harishc--dev-181717?style=flat-square&logo=github)](https://github.com/harishc-dev)

---

## 🙏 Acknowledgments

- **Tailwind CSS** - For rapid styling and responsive utilities
- **Socket.IO** - For real-time bidirectional communication
- **Express.js** - For robust server framework
- **EJS** - For simple and powerful templating
- **Lucide Icons** - (If used) For beautiful consistent icons

---

## ⭐ Show Your Support

If this project helps your event or inspires your work, please consider giving it a ⭐ on GitHub!

---

## 📧 Support & Contact

For issues, questions, or feature requests:
- 🐛 Open an [Issue](https://github.com/harishc-dev/Restaurant-billing-app/issues)
- 💬 Start a [Discussion](https://github.com/harishc-dev/Restaurant-billing-app/discussions)

---

<div align="center">

**Made with ❤️ by Harish C**

*Delicious food, seamless service — powered by code.*

</div>








