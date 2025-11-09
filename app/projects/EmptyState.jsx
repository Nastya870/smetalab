import PropTypes from 'prop-types';

// material-ui
import { Button, Box, Typography } from '@mui/material';
import { IconPlus, IconBriefcase } from '@tabler/icons-react';

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
      <IconBriefcase size={64} stroke={1.5} style={{ marginBottom: 16, opacity: 0.3 }} />
      <Typography variant="h3" color="text.secondary" gutterBottom>
        Нет проектов
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Создайте ваш первый проект, чтобы начать работу
      </Typography>
      <Button variant="contained" color="primary" startIcon={<IconPlus />} onClick={onCreateClick}>
        Создать проект
      </Button>
    </Box>
  );
};

EmptyState.propTypes = {
  onCreateClick: PropTypes.func.isRequired
};

export default EmptyState;
