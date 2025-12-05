import PropTypes from 'prop-types';

// material-ui
import { Button, Box, Typography } from '@mui/material';
import { IconPlus, IconTool } from '@tabler/icons-react';

// ==============================|| EMPTY STATE ||============================== //

const EmptyState = ({ onCreateClick }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8
      }}
    >
      <IconTool size={64} stroke={1.5} style={{ marginBottom: 16, opacity: 0.3 }} />
      <Typography variant="h3" color="text.secondary" gutterBottom>
        Нет работ
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Добавьте виды работ для использования в сметах
      </Typography>
      <Button variant="contained" color="primary" startIcon={<IconPlus />} onClick={onCreateClick} size="small">
        Добавить работу
      </Button>
    </Box>
  );
};

EmptyState.propTypes = {
  onCreateClick: PropTypes.func.isRequired
};

export default EmptyState;
