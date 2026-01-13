// material-ui
import { Box } from '@mui/material';

// project imports
import logo from 'assets/images/smeta-lab-logo.png';
import useAuth from 'hooks/useAuth';

// ==============================|| SMETA LAB LOGO ||============================== //

export default function Logo() {
  const { tenant } = useAuth();
  
  // Используем логотип организации, если он есть, иначе дефолтный
  const logoSrc = tenant?.logoUrl || logo;
  
  return (
    <Box
      component="img"
      src={logoSrc}
      alt={tenant?.name || "Smeta Lab"}
      sx={{
        height: 'auto',
        width: '95px',
        maxWidth: '100%',
        objectFit: 'contain',
        mr: 2 // отступ справа для "дыхания"
      }}
    />
  );
}
