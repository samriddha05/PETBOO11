import { useLocation } from 'react-router-dom';
import { Search, Bell, ShoppingCart, LogOut, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState, useRef, useEffect, useCallback } from 'react';
import CartDrawer from './CartDrawer';
import DarkModeToggle from './DarkModeToggle';
import './TopNav.css';

const PAGE_TITLES = {
  '/':           'Dashboard',
  '/pets':       'My Pets',
  '/chat':       'Cuddles AI',
  '/shop':       'Pet Shop',
  '/fresh-food': 'Fresh Food',
  '/admin':      'Admin Panel',
};

export default function TopNav() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { totalItems } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Buddy's vaccine is due soon!", time: "2 hours ago", unread: true },
    { id: 2, text: "New pet supply discount available", time: "5 hours ago", unread: true },
  ]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  const pageTitle = Object.entries(PAGE_TITLES).find(
    ([path]) => path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] || 'PetSphere';

  useEffect(() => {
    const handleScroll = () => {
      const scrollEl = document.querySelector('.app-layout__main');
      if (scrollEl) {
        setScrolled(scrollEl.scrollTop > 10);
      }
    };
    
    const scrollEl = document.querySelector('.app-layout__main');
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    }

    const handleClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    
    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', handleScroll);
      }
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const handleCartClose = useCallback(() => setCartOpen(false), []);

  const handleClearAll = (e) => {
    e.stopPropagation();
    setNotifications([]);
    setHasUnreadNotifications(false);
  };

  const handleDismissNotification = (id, e) => {
    e.stopPropagation();
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    if (updated.length === 0 || !updated.some(n => n.unread)) {
      setHasUnreadNotifications(false);
    }
  };

  return (
    <>
      <header className={`topnav ${scrolled ? 'topnav--scrolled' : ''}`}>
        <div className="topnav__left">
          <h2 className="topnav__title">{pageTitle}</h2>
        </div>

        <div className="topnav__right">
          <DarkModeToggle />
          
          {/* Search */}
          <div className="topnav__search">
            <Search size={16} className="topnav__search-icon" />
            <input
              type="text"
              className="topnav__search-input"
              placeholder="Search anything…"
            />
          </div>

          {/* Cart */}
          <button
            className="topnav__icon-btn"
            title="Cart"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart size={19} />
            {totalItems > 0 && <span className="topnav__badge">{totalItems}</span>}
          </button>

          {/* Notifications */}
          <div className="topnav__notifications" ref={notificationDropdownRef}>
            <button 
              className="topnav__icon-btn" 
              title="Notifications"
              onClick={(e) => { 
                e.stopPropagation(); 
                setNotificationsOpen(p => !p);
                // Mark all as read when opening
                setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                setHasUnreadNotifications(false); 
              }}
            >
              <Bell size={19} />
              {hasUnreadNotifications && <span className="topnav__dot" />}
            </button>

            {notificationsOpen && (
              <div className="topnav__dropdown topnav__dropdown--notifications">
                <div className="topnav__dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p className="topnav__dropdown-name">Notifications</p>
                    <small>
                      {notifications.length > 0 
                        ? `You have ${notifications.length} message${notifications.length > 1 ? 's' : ''}`
                        : 'All caught up!'}
                    </small>
                  </div>
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleClearAll}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--accent-orange)', 
                        fontSize: '0.8rem', 
                        fontWeight: '700', 
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'var(--bg-secondary)'}
                      onMouseOut={(e) => e.target.style.background = 'none'}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="topnav__dropdown-divider" />
                
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className="topnav__dropdown-item" style={{ position: 'relative', paddingRight: '32px' }}>
                      <div className="notification-item">
                        {n.unread && <span className="notification-dot"></span>}
                        <div>
                          <p style={{ paddingRight: '8px' }}>{n.text}</p>
                          <small>{n.time}</small>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDismissNotification(n.id, e)}
                        title="Dismiss"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          borderRadius: '50%',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'var(--bg-secondary)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>No new notifications</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="topnav__profile" ref={profileDropdownRef}>
            <button
              className="topnav__avatar"
              onClick={(e) => { e.stopPropagation(); setProfileOpen(p => !p); }}
            >
              <User size={18} />
            </button>

            {profileOpen && (
              <div className="topnav__dropdown">
                <div className="topnav__dropdown-header">
                  <p className="topnav__dropdown-name">
                    {user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'Guest'}
                  </p>
                  <small>{user?.email || 'Not signed in'}</small>
                </div>
                <div className="topnav__dropdown-divider" />
                <button className="topnav__dropdown-item logout" onClick={signOut}>
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={handleCartClose} />
    </>
  );
}
