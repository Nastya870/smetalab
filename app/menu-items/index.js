import dashboard from './dashboard';
import projects from './projects';
import purchases from './purchases';
import references from './references';
import admin from './admin';
// Скрыты временно (не удалены)
// import pages from './pages';
// import utilities from './utilities';
// import other from './other';

// ==============================|| MENU ITEMS ||============================== //

const menuItems = {
  items: [
    dashboard, 
    projects, 
    purchases, 
    references, 
    admin
    // Скрыты из сайдбара (не удалены):
    // pages,      // Pages Caption (Authentication: login, register)
    // utilities,  // Utilities (Typography, Color, Shadow)
    // other       // Sample Page, Documentation
  ]
};

export default menuItems;
