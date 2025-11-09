import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  IconChevronLeft,
  IconChevronRight,
  IconHome2,
  IconRuler,
  IconWall,
  IconWindow,
  IconSquare,
  IconDoor
} from '@tabler/icons-react';

// API
import objectParametersAPI from 'api/objectParametersAPI';

// Вспомогательная функция для форматирования чисел
const formatNumber = (value) => {
  if (!value || value === 0) return '0';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(2).replace('.', ',');
};

// ==============================|| OBJECT PARAMETERS SIDEBAR ||============================== //

const ObjectParametersSidebar = ({ estimateId, open, onToggle }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [expandedRooms, setExpandedRooms] = useState([]);

  // Загрузка данных при открытии
  useEffect(() => {
    if (open && estimateId) {
      loadData();
    }
  }, [open, estimateId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем параметры и статистику параллельно
      const [paramsData, statsData] = await Promise.all([
        objectParametersAPI.getByEstimateId(estimateId),
        objectParametersAPI.getStatistics(estimateId)
      ]);

      setParameters(paramsData || []);
      setStatistics(statsData || null);
    } catch (err) {
      console.error('Error loading object parameters:', err);
      setError('Не удалось загрузить параметры объекта');
    } finally {
      setLoading(false);
    }
  };

  // Переключение раскрытия помещения
  const toggleRoom = (roomId) => {
    setExpandedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Компонент карточки показателя
  const MetricCard = ({ icon: Icon, label, value, unit, color = 'primary' }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: `${color}.lighter`,
        borderRadius: 1,
        border: '1px solid',
        borderColor: `${color}.light`
      }}
    >
      <Icon size={18} color={`var(--mui-palette-${color}-main)`} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} color={`${color}.dark`} sx={{ fontSize: '0.85rem' }}>
          {formatNumber(value)} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{unit}</span>
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Кнопка открытия (когда drawer закрыт) */}
      {!open && (
        <Tooltip title="Показать параметры помещений" placement="left">
          <IconButton
            onClick={onToggle}
            sx={{
              position: 'fixed',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1200,
              bgcolor: 'primary.main',
              color: 'white',
              boxShadow: 3,
              '&:hover': {
                bgcolor: 'primary.dark',
                boxShadow: 6
              },
              width: 40,
              height: 40
            }}
          >
            <IconHome2 size={20} />
          </IconButton>
        </Tooltip>
      )}

      {/* Выдвижной Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={onToggle}
        variant="persistent"
        sx={{
          width: 320,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 320,
            boxSizing: 'border-box',
            boxShadow: '-4px 0 8px rgba(0,0,0,0.1)',
            bgcolor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        {/* Заголовок */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'primary.lighter',
            borderBottom: '2px solid',
            borderColor: 'primary.main'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconHome2 size={20} color="var(--mui-palette-primary-main)" />
            <Typography variant="h6" fontSize="0.95rem" fontWeight={600}>
              Параметры помещений
            </Typography>
          </Box>
          <IconButton onClick={onToggle} size="small">
            <IconChevronRight size={20} />
          </IconButton>
        </Box>

        {/* Контент */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && parameters.length === 0 && (
            <Alert severity="info">
              Параметры помещений не заполнены. Перейдите на вкладку "Параметры объекта" для заполнения.
            </Alert>
          )}

          {!loading && !error && statistics && (
            <>
              {/* Общие итоги */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ fontSize: '0.8rem' }}>
                  Общие итоги
                </Typography>
                <Stack spacing={1}>
                  <MetricCard
                    icon={IconRuler}
                    label="Площадь пола"
                    value={statistics.total_floor_area}
                    unit="м²"
                    color="primary"
                  />
                  <MetricCard
                    icon={IconWall}
                    label="Площадь стен"
                    value={statistics.total_wall_area}
                    unit="м²"
                    color="success"
                  />
                  <MetricCard
                    icon={IconWindow}
                    label="Откосы"
                    value={statistics.total_window_slopes}
                    unit="м"
                    color="warning"
                  />
                  <MetricCard
                    icon={IconSquare}
                    label="Площадь потолка"
                    value={statistics.total_ceiling_area}
                    unit="м²"
                    color="info"
                  />
                </Stack>

                {/* Счетчики */}
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Chip
                    icon={<IconHome2 size={14} />}
                    label={`${statistics.rooms_count || 0} помещений`}
                    size="small"
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                  <Chip
                    icon={<IconWindow size={14} />}
                    label={`${statistics.total_windows_count || 0} окон`}
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Список помещений */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ fontSize: '0.8rem', mb: 1.5 }}>
                  По помещениям
                </Typography>
                <Stack spacing={1.5}>
                  {parameters.map((param, index) => (
                    <Box
                      key={param.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: 'background.paper'
                      }}
                    >
                      {/* Заголовок помещения */}
                      <Box
                        onClick={() => toggleRoom(param.id)}
                        sx={{
                          p: 1.5,
                          cursor: 'pointer',
                          bgcolor: expandedRooms.includes(param.id) ? 'primary.lighter' : 'grey.50',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: 'primary.lighter'
                          }
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                                fontSize: '0.65rem',
                                fontWeight: 600
                              }}
                            >
                              {index + 1}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                              {param.room_name || `Помещение ${index + 1}`}
                            </Typography>
                          </Box>
                          <IconButton size="small">
                            {expandedRooms.includes(param.id) ? (
                              <IconChevronLeft size={16} />
                            ) : (
                              <IconChevronRight size={16} />
                            )}
                          </IconButton>
                        </Stack>
                      </Box>

                      {/* Детали помещения */}
                      <Collapse in={expandedRooms.includes(param.id)}>
                        <Box sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                          <Stack spacing={0.75}>
                            {param.floor_area > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  S пола
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="primary.dark" sx={{ fontSize: '0.8rem' }}>
                                  {formatNumber(param.floor_area)} м²
                                </Typography>
                              </Box>
                            )}
                            {param.wall_area > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  S стен
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="success.dark" sx={{ fontSize: '0.8rem' }}>
                                  {formatNumber(param.wall_area)} м²
                                </Typography>
                              </Box>
                            )}
                            {param.total_window_slopes > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Откосы
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="warning.dark" sx={{ fontSize: '0.8rem' }}>
                                  {formatNumber(param.total_window_slopes)} м
                                </Typography>
                              </Box>
                            )}
                            {param.ceiling_area > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  S потолка
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="info.dark" sx={{ fontSize: '0.8rem' }}>
                                  {formatNumber(param.ceiling_area)} м²
                                </Typography>
                              </Box>
                            )}
                            {param.ceiling_slopes > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Откосы пот.
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="secondary.dark" sx={{ fontSize: '0.8rem' }}>
                                  {formatNumber(param.ceiling_slopes)} м
                                </Typography>
                              </Box>
                            )}
                            {param.doors_count > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  Двери
                                </Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                  {param.doors_count} шт
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </Collapse>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Box>

        {/* Футер с кнопкой обновления */}
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50'
          }}
        >
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {parameters.length > 0 && `Обновлено: ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
            </Typography>
            <IconButton
              size="small"
              onClick={loadData}
              disabled={loading}
              sx={{ bgcolor: 'background.paper' }}
            >
              {loading ? <CircularProgress size={16} /> : <IconHome2 size={16} />}
            </IconButton>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
};

ObjectParametersSidebar.propTypes = {
  estimateId: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

export default ObjectParametersSidebar;
