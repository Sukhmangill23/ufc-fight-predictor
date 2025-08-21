import React from 'react';
import { useAuth } from '../context/AuthContext';


const LogoutButton = () => {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className="btn btn-danger"
    >
      <i className="fas fa-sign-out-alt me-2"></i>
      Logout
    </button>
  );
};

export default LogoutButton;
