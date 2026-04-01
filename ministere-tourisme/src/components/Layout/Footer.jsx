import React from 'react';

import { Navbar, Nav, NavItem } from 'reactstrap';

import SourceLink from 'components/SourceLink';

const Footer = ({ style, ...props }) => {
  return (
    <Navbar style={{ ...style, width: '100%', padding: '10px 0', marginTop: 'auto' }} {...props}>
      <Nav navbar>
        <NavItem>
          Tous droits réservés 2ise-groupe 2025
        </NavItem>
      </Nav>
    </Navbar>
  );
};

export default Footer;
