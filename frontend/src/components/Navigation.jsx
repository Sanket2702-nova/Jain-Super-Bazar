import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

function Navigation({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <Navbar expand="lg" variant="dark" className="mb-4">
      <Container>
        <Navbar.Brand href="#" style={{ color: 'white', fontFamily: '"Arial Black", Gadget, sans-serif', fontWeight: 'bold', fontSize: '1.5rem' }}>JAIN SUPER BAZAR</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
          <Nav className="align-items-center">
            <span className="text-secondary me-3">
              {user.role === 'Admin' ? 'Admin Panel' : `Branch: ${user.branch_name}`}
            </span>
            <Button variant="outline-danger" size="sm" onClick={handleLogout} className="d-flex align-items-center">
              <FiLogOut className="me-2" /> Logout
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigation;
