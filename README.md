# Makro Inventory Management System

A web-based inventory management system with QR code access support.

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy with Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and get your URL!

### Option 2: Deploy with Git

1. Push this code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Deploy automatically!

## 📱 QR Code Access

After deployment, your app will be available at:
- `https://[your-project-name].vercel.app`

Open `qr-generator.html` after deployment to get a QR code for mobile access.

## 🎯 Features

- **Inventory Management**: Track stock levels with automatic safety stock calculations
- **Sales Tracking**: Record daily, weekly, and monthly sales
- **Product Attributes**: Manage product categories (Push/Non-Push, Usual/Clean)
- **Custom Pricing**: Edit product prices
- **Safety Stock Settings**: Customize calculation period (default: 8 days)
- **Mobile Friendly**: Responsive design works on all devices
- **QR Code Access**: Share via QR code for instant mobile access

## 📦 File Structure

```
├── index.html          # Main application
├── styles.css          # Styles
├── app.js             # Application logic
├── qr-generator.html  # QR code generator
├── vercel.json        # Vercel configuration
└── objects/           # Images folder
    └── cangku.png     # Custom icon
```

## 💾 Data Storage

All data is stored locally in the browser's localStorage:
- Inventory data
- Sales history
- Product attributes
- Custom settings

## 🔗 After Deployment

1. Access your app at the Vercel URL
2. Share the QR code from `qr-generator.html`
3. Users can scan to instantly access the system
4. All data saves locally on each device

## 📞 Support

For issues or questions, please check the application's Personal section for settings and configurations.