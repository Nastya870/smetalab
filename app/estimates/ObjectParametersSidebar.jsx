import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  CircularProgress,
  Collapse
} from '@mui/material';
import {
  IconChevronRight,
  IconChevronDown,
  IconX,
  IconHome2,
  IconRuler,
  IconWindow,
  IconDoor
} from '@tabler/icons-react';

// API
import objectParametersAPI from 'api/objectParametersAPI';

// Вспомогательная функция для форматирования чисел
const formatNumber = (value) => {
  if (!value || value === 0) return '0,00';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0,00';
  return num.toFixed(2).replace('.', ',');
};

// ==============================|| OBJECT PARAMETERS SIDEBAR - REDESIGNED ||============================== //

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

  // Компонент карточки метрики в новом стиле
  const MetricCard = ({ label, value, unit, color }) => (
    <Box
      sx={{
        p: 2,
        bgcolor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E5E7EB',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: '#D1D5DB'
        }
      }}
    >
      <Typography sx={{ 
        fontSize: '0.75rem', 
        color: '#6B7280',
        mb: 0.5
      }}>
        {label}
      </Typography>
      <Typography sx={{ 
        fontSize: '1rem', 
        fontWeight: 600, 
        color: color
      }}>
        {formatNumber(value)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9CA3AF' }}>{unit}</span>
      </Typography>
    </Box>
  );

  return (
    <>
      {/* ✅ Кнопка открытия (когда drawer закрыт) */}
      {!open && (
        <Box
          onClick={onToggle}
          sx={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1200,
            width: 32,
            height: 48,
            bgcolor: '#FFFFFF',
            borderRadius: '8px 0 0 8px',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.08)',
            border: '1px solid #E5E7EB',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: '#F9FAFB',
              width: 36,
              boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <IconHome2 size={16} color="#635BFF" />
        </Box>
      )}

      {/* ✅ Drawer в стиле справочника работ */}
      <Drawer
        anchor="right"
        open={open}
        onClose={onToggle}
        variant="persistent"
        sx={{
          width: 400,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 400,
            boxSizing: 'border-box',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.06)',
            bgcolor: '#F9FAFB',
            border: 'none'
          }
        }}
      >
        {/* ✅ Заголовок - чистый минималистичный */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB'
          }}
        >
          <Typography sx={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            color: '#111827'
          }}>
            Параметры помещений
          </Typography>
          <IconButton 
            onClick={onToggle} 
            size="small"
            sx={{ 
              color: '#6B7280',
              '&:hover': { bgcolor: '#F3F4F6' }
            }}
          >
            <IconChevronRight size={20} />
          </IconButton>
        </Box>

        {/* ✅ Контент */}
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* Loading */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress size={24} sx={{ color: '#635BFF' }} />
            </Box>
          )}

          {/* Error */}
          {error && (
            <Box sx={{ px: 2.5, py: 3 }}>
              <Box sx={{ 
                p: 2, 
                borderRadius: '10px', 
                bgcolor: '#FEF2F2', 
                border: '1px solid #FECACA'
              }}>
                <Typography sx={{ fontSize: '0.8125rem', color: '#DC2626' }}>
                  {error}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Empty state */}
          {!loading && !error && parameters.length === 0 && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 6,
              px: 3
            }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <IconHome2 size={24} color="#9CA3AF" />
              </Box>
              <Typography sx={{ 
                fontSize: '0.9375rem', 
                fontWeight: 600, 
                color: '#374151',
                mb: 0.5,
                textAlign: 'center'
              }}>
                Параметры не заполнены
              </Typography>
              <Typography sx={{ 
                fontSize: '0.8125rem', 
                color: '#9CA3AF',
                textAlign: 'center'
              }}>
                Перейдите на вкладку "Параметры объекта"
              </Typography>
            </Box>
          )}

          {/* ✅ Данные */}
          {!loading && !error && statistics && (
            <Box sx={{ p: 2.5 }}>
              
              {/* Секция: Общие итоги */}
              <Typography sx={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5
              }}>
                Общие итоги
              </Typography>

              {/* Карточки метрик */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                <MetricCard
                  label="Площадь пола"
                  value={statistics.total_floor_area}
                  unit="м²"
                  color="#3B82F6"
                />
                <MetricCard
                  label="Площадь стен"
                  value={statistics.total_wall_area}
                  unit="м²"
                  color="#EF4444"
                />
                <MetricCard
                  label="Откосы"
                  value={statistics.total_window_slopes}
                  unit="м"
                  color="#F97316"
                />
                <MetricCard
                  label="Площадь потолка"
                  value={statistics.total_ceiling_area}
                  unit="м²"
                  color="#3B82F6"
                />
              </Box>

              {/* Счётчики - таблетки */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '20px',
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E5E7EB'
                }}>
                  <IconHome2 size={14} color="#6B7280" />
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                    {statistics.rooms_count || 0} помещений
                  </Typography>
                </Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '20px',
                  bgcolor: '#FEF3C7',
                  border: '1px solid #FCD34D'
                }}>
                  <IconWindow size={14} color="#D97706" />
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#92400E' }}>
                    {statistics.total_windows_count || 0} окон
                  </Typography>
                </Box>
              </Box>

              {/* Секция: По помещениям */}
              <Typography sx={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1.5
              }}>
                По помещениям
              </Typography>

              {/* Список помещений */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {parameters.map((param, index) => (
                  <Box
                    key={param.id}
                    sx={{
                      bgcolor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Заголовок помещения */}
                    <Box
                      onClick={() => toggleRoom(param.id)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: '#F9FAFB'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '6px',
                          bgcolor: '#EEF2FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography sx={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            color: '#4F46E5'
                          }}>
                            {index + 1}
                          </Typography>
                        </Box>
                        <Typography sx={{ 
                          fontSize: '0.875rem', 
                          fontWeight: 600, 
                          color: '#111827'
                        }}>
                          {param.room_name || `Помещение ${index + 1}`}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        sx={{ 
                          width: 28, 
                          height: 28,
                          color: '#6B7280'
                        }}
                      >
                        {expandedRooms.includes(param.id) ? (
                          <IconChevronDown size={16} />
                        ) : (
                          <IconChevronRight size={16} />
                        )}
                      </IconButton>
                    </Box>

                    {/* Детали помещения */}
                    <Collapse in={expandedRooms.includes(param.id)}>
                      <Box sx={{ 
                        px: 2, 
                        pb: 2,
                        pt: 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75
                      }}>
                        {/* S пола */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          py: 0.5
                        }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                            S пола
                          </Typography>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#3B82F6' }}>
                            {formatNumber(param.floor_area)} м²
                          </Typography>
                        </Box>
                        
                        {/* S стен */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          py: 0.5
                        }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                            S стен
                          </Typography>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#EF4444' }}>
                            {formatNumber(param.wall_area)} м²
                          </Typography>
                        </Box>
                        
                        {/* Откосы */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          py: 0.5
                        }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                            Откосы
                          </Typography>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#F97316' }}>
                            {formatNumber(param.total_window_slopes)} м
                          </Typography>
                        </Box>
                        
                        {/* S потолка */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          py: 0.5
                        }}>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                            S потолка
                          </Typography>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#3B82F6' }}>
                            {formatNumber(param.ceiling_area)} м²
                          </Typography>
                        </Box>

                        {/* Откосы потолка (если есть) */}
                        {param.ceiling_slopes > 0 && (
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            py: 0.5
                          }}>
                            <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                              Откосы пот.
                            </Typography>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#8B5CF6' }}>
                              {formatNumber(param.ceiling_slopes)} м
                            </Typography>
                          </Box>
                        )}

                        {/* Двери (если есть) */}
                        {param.doors_count > 0 && (
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            py: 0.5
                          }}>
                            <Typography sx={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                              Двери
                            </Typography>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>
                              {param.doors_count} шт
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* ✅ Футер - минималистичный */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderTop: '1px solid #E5E7EB',
            bgcolor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
            Обновлено: {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
          <IconButton
            size="small"
            onClick={loadData}
            disabled={loading}
            sx={{ 
              width: 28,
              height: 28,
              color: '#6B7280',
              '&:hover': { bgcolor: '#F3F4F6' }
            }}
          >
            {loading ? <CircularProgress size={14} /> : <IconHome2 size={14} />}
          </IconButton>
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
