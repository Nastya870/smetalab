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
        pt: 1.5,
        pb: 1,
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
