import { useNavigate, useLocation } from 'react-router-dom';

const CART_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const BACK_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛒</span>
          <h1 className="text-xl font-bold text-indigo-700">רשימות קניות</h1>
        </div>
        {isHome ? (
          <button
            onClick={() => navigate('/lists')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium px-4 py-2 rounded-xl transition-all duration-150 shadow-md hover:shadow-lg"
          >
            {CART_ICON}
            <span className="hidden sm:inline">רשימות</span>
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium px-3 py-2 rounded-xl hover:bg-indigo-50 transition-all duration-150"
          >
            {BACK_ICON}
            <span>חזרה</span>
          </button>
        )}
      </div>
    </header>
  );
}
