// material-ui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        pt: 3,
        pb: 2.5,
        mt: 'auto'
      }}
    >
      <Typography 
        variant="caption"
        sx={{
          opacity: 0.65,
          fontSize: '0.75rem',
          color: 'text.secondary'
        }}
      >
        © 2025 Smeta Lab. Система управления сметами
      </Typography>
    </Stack>
  );
}
