import PropTypes from 'prop-types';

// material-ui
import { Box, Typography } from '@mui/material';

// ==============================|| PROJECT STATS CARD ||============================== //

const ProjectStatsCard = ({ title, value, bgcolor, color }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Цветной кружок */}
      <Box 
        sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%', 
          bgcolor: color,
          flexShrink: 0 
        }} 
      />
      
      {/* Текст */}
      <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.primary' }}>
        {title} — <strong>{value}</strong>
      </Typography>
    </Box>
  );
};

ProjectStatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  bgcolor: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired
};

export default ProjectStatsCard;
