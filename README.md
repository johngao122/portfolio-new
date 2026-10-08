# 3D Portfolio — Cleared for Takeoff

A travel-themed 3D portfolio built with React, Three.js and Vite. Scrolling flies a cel-shaded plane off a floating island, up to a globe of local drinks from every place I've been, then through a bar where each job is poured, a baggage carousel of projects, and an arrivals hall with a postcard contact form.

## 🌟 Features

-   Interactive 3D elements and animations
-   Responsive design that works on all devices
-   Modern UI/UX with Framer Motion animations
-   Contact form integration with EmailJS
-   3D model rendering with React Three Fiber
-   Smooth page transitions
-   Timeline component for experience section
-   Parallax effects
-   Custom 3D models and geometries

## 🛠️ Tech Stack

-   React.js
-   Three.js
-   React Three Fiber
-   React Three Drei
-   Tailwind CSS
-   Framer Motion
-   EmailJS
-   Vite
-   React Router DOM

## 🚀 Getting Started

### Prerequisites

-   Node.js (v14 or higher)
-   npm or yarn

### Installation

1. Clone the repository

```bash
git clone [your-repo-url]
cd 3dfolio
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and add your EmailJS credentials (used by the postcard form):

```env
VITE_EMAILJS_RECEIVERID=your_service_id
VITE_EMAILJS_TEMPLATEID=your_template_id
VITE_EMAILJS_USERID=your_public_key
```

4. Start the development server

```bash
npm run dev
# or
yarn dev
```

5. Build for production

```bash
npm run build
# or
yarn build
```

## 📁 Project Structure

```
3dfolio/
├── src/
│   ├── assets/      # Static assets (images, 3D models)
│   ├── components/  # React components
│   ├── constants/   # Constants and configuration
│   ├── hoc/        # Higher-order components
│   ├── utils/      # Utility functions
│   ├── App.jsx     # Main application component
│   └── main.jsx    # Application entry point
├── public/         # Public assets
└── ...config files
```

## ✈️ The travel world (`src/travel/`)

-   `TravelPortfolio.jsx` renders the page overlays and starts the 3D world
-   `engine.js` builds the scenes (island, globe, lounge, carousel, arrivals) and drives the scroll camera
-   `data.js` holds the destinations: each stop has a drink, a note, a label `style`, and optional `when` / `verdict` fields that appear on the card once filled in
-   Experience and projects come straight from `src/constants/index.js`, so editing those updates the bar and the baggage carousel

## 🎨 Customization

-   Edit `src/constants/` files to update content
-   Modify `src/styles.js` for styling constants
-   Update 3D models in `src/assets/`
-   Customize animations in respective components

## 🙏 Acknowledgments

-   Three.js community
-   React Three Fiber team
-   JavaScript Mastery for the template
