import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../App.css'


const LogoutButton = () => {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className="btn-logout"
    >
      <i className="fas fa-sign-out-alt me-2"></i>
      Logout
    </button>
  );
};

export default LogoutButton;
