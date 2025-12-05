// material-ui
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// ==============================|| FOOTER - AUTHENTICATION 2 & 3 ||============================== //

export default function AuthFooter() {
  return (
    <Stack direction="row" sx={{ justifyContent: 'center' }}>
      <Typography variant="subtitle2" component={Link} href="https://www.smeta-lab.ru" target="_blank" underline="hover">
        © 2025 Smeta Lab
      </Typography>
    </Stack>
  );
}
