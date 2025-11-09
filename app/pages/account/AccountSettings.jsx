// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import useAuth from 'hooks/useAuth';

// ==============================|| ACCOUNT SETTINGS PAGE ||============================== //

const AccountSettings = () => {
  const theme = useTheme();
  const { user, tenant, getRoleDisplayName } = useAuth();

  return (
    <MainCard title="Настройки аккаунта">
      <Grid container spacing={3}>
        {/* Информация о пользователе */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: theme.palette.primary.light }}>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Информация о пользователе
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Полное имя
                  </Typography>
                  <Typography variant="body1">{user?.fullName || 'Не указано'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{user?.email || 'Не указано'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Телефон
                  </Typography>
                  <Typography variant="body1">{user?.phone || 'Не указано'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Роль
                  </Typography>
                  <Typography variant="body1">{getRoleDisplayName()}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Информация о компании */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: theme.palette.secondary.light }}>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Информация о компании
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Название компании
                  </Typography>
                  <Typography variant="body1">{tenant?.name || 'Не указано'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    ID компании
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {tenant?.id || 'Не указано'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Дата создания
                  </Typography>
                  <Typography variant="body1">
                    {tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString('ru-RU') : 'Не указано'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Заглушка для будущих настроек */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h3" gutterBottom>
                Дополнительные настройки
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                🚧 Раздел в разработке
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Здесь будут доступны:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 3 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Изменение пароля
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Настройки уведомлений
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Настройки безопасности
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Двухфакторная аутентификация
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default AccountSettings;
