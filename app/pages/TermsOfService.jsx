import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';

// ==============================|| TERMS OF SERVICE ||============================== //

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Кнопка назад */}
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ mb: 3 }}
          >
            Назад
          </Button>

          {/* Заголовок */}
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Условия использования
          </Typography>
          
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Последнее обновление: 1 ноября 2025 г.
          </Typography>

          <Divider sx={{ mb: 4 }} />

          {/* 1. Общие положения */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            1. Общие положения
          </Typography>
          <Typography paragraph>
            Настоящие Условия использования (далее — "Условия") регулируют использование 
            программного обеспечения Smeta Lab (далее — "Сервис"), предоставляемого 
            компанией для создания строительных смет и управления проектами.
          </Typography>
          <Typography paragraph>
            Используя наш Сервис, вы соглашаетесь с настоящими Условиями. 
            Если вы не согласны с какими-либо положениями, пожалуйста, не используйте Сервис.
          </Typography>

          {/* 2. Описание сервиса */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            2. Описание сервиса
          </Typography>
          <Typography paragraph>
            Smeta Lab — это облачная платформа для:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Создания и расчета строительных смет" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Управления материалами и ресурсами" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Ведения проектной документации" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Командной работы над проектами" />
            </ListItem>
          </List>

          {/* 3. Регистрация и аккаунт */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            3. Регистрация и управление аккаунтом
          </Typography>
          <Typography paragraph>
            Для использования Сервиса необходимо создать аккаунт, предоставив 
            достоверную информацию о себе и своей компании.
          </Typography>
          <Typography paragraph>
            Вы обязуются:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Предоставлять точную и актуальную информацию" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Поддерживать безопасность своего пароля" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Немедленно уведомлять о подозрительной активности" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Не передавать доступ третьим лицам" />
            </ListItem>
          </List>

          {/* 4. Использование сервиса */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            4. Правила использования
          </Typography>
          <Typography paragraph>
            При использовании Сервиса запрещается:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Нарушать законодательство Российской Федерации" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Загружать вредоносное программное обеспечение" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Попытки несанкционированного доступа к системе" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Распространение спама или нежелательного контента" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Использование автоматизированных средств без разрешения" />
            </ListItem>
          </List>

          {/* 5. Интеллектуальная собственность */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            5. Интеллектуальная собственность
          </Typography>
          <Typography paragraph>
            Все права на Sервис, включая программное обеспечение, дизайн, 
            товарные знаки и контент, принадлежат нашей компании или лицензиарам.
          </Typography>
          <Typography paragraph>
            Данные, загружаемые вами в Сервис, остаются вашей собственностью. 
            Мы обязуемся обеспечивать их конфиденциальность и безопасность.
          </Typography>

          {/* 6. Конфиденциальность */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            6. Защита персональных данных
          </Typography>
          <Typography paragraph>
            Обработка персональных данных осуществляется в соответствии с 
            Федеральным законом "О персональных данных" № 152-ФЗ и нашей 
            Политикой конфиденциальности.
          </Typography>
          <Typography paragraph>
            Мы используем современные методы шифрования и защиты данных для 
            обеспечения безопасности вашей информации.
          </Typography>

          {/* 7. Ограничение ответственности */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            7. Ограничение ответственности
          </Typography>
          <Typography paragraph>
            Сервис предоставляется "как есть". Мы не гарантируем бесперебойную 
            работу и не несем ответственности за:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Временные технические сбои" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Потерю данных по причинам, не зависящим от нас" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Косвенные убытки от использования Сервиса" />
            </ListItem>
          </List>

          {/* 8. Платежи */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            8. Условия оплаты
          </Typography>
          <Typography paragraph>
            Доступ к расширенной функциональности предоставляется на основе 
            выбранного тарифного плана. Оплата производится согласно 
            действующим тарифам на момент подписки.
          </Typography>
          <Typography paragraph>
            Возврат средств возможен в течение 14 дней с момента оплаты 
            при условии неиспользования платных функций.
          </Typography>

          {/* 9. Изменения условий */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            9. Изменения условий
          </Typography>
          <Typography paragraph>
            Мы оставляем за собой право изменять настоящие Условия. 
            О существенных изменениях мы уведомляем пользователей 
            заблаговременно через электронную почту или уведомления в Сервисе.
          </Typography>

          {/* 10. Контактная информация */}
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
            10. Контактная информация
          </Typography>
          <Typography paragraph>
            По вопросам, связанным с настоящими Условиями, обращайтесь:
          </Typography>
          <Typography paragraph>
            <strong>Email:</strong> legal@smeta-lab.ru<br />
            <strong>Телефон:</strong> +7 (495) 123-45-67<br />
            <strong>Адрес:</strong> Россия, г. Москва, ул. Примерная, 123
          </Typography>

          <Divider sx={{ my: 4 }} />

          <Typography variant="body2" align="center" color="text.secondary">
            Принимая настоящие Условия, вы подтверждаете, что прочитали, 
            поняли и согласны соблюдать все указанные положения.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default TermsOfService;