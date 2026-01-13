import PropTypes from 'prop-types';

// material-ui
import { Box, Typography } from '@mui/material';

// ==============================|| PROJECT STATS CARD - MINIMAL ||============================== //

const ProjectStatsCard = ({ title, value, color }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.5,
        cursor: 'default',
        transition: 'opacity 0.15s ease',
        '&:hover': {
          opacity: 0.7
        }
      }}
    >
      {/* Цветной кружок - минимальный 6px */}
      <Box 
        sx={{ 
          width: 6, 
          height: 6, 
          borderRadius: '50%', 
          bgcolor: color,
          flexShrink: 0
        }} 
      />
      
      {/* Текст - компактный */}
      <Typography 
        component="span"
        sx={{ 
          fontSize: '0.6875rem', 
          color: '#6B7280',
          fontWeight: 400,
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1
        }}
      >
        {title}
        <Box 
          component="span" 
          sx={{ 
            fontWeight: 600, 
            color: '#374151',
            fontSize: '0.6875rem'
          }}
        >
          {value}
        </Box>
      </Typography>
    </Box>
  );
};

ProjectStatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  color: PropTypes.string.isRequired
};

export default ProjectStatsCard;
