import PropTypes from 'prop-types';
// material-ui
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// ==============================|| AUTHENTICATION CARD WRAPPER ||============================== //

export default function AuthCardWrapper({ children, ...other }) {
  return (
    <MainCard
      sx={{
        maxWidth: { xs: 420, sm: 460, lg: 500 },
        width: '100%',
        margin: { xs: 2, md: 3 },
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        '& > *': {
          flexGrow: 1,
          flexBasis: '50%'
        }
      }}
      content={false}
      {...other}
    >
      <Box sx={{ p: { xs: 3, sm: 4, xl: 5 } }}>{children}</Box>
    </MainCard>
  );
}

AuthCardWrapper.propTypes = { children: PropTypes.any, other: PropTypes.any };
