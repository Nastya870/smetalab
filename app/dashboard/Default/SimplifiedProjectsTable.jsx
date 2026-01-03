import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip
} from '@mui/material';

/**
 * Упрощенная таблица проектов по прибыльности
 * Только: название, прибыль, статус
 */
const SimplifiedProjectsTable = ({ projectsData = [], isLoading = false }) => {
  // Моковые данные
  const mockProjects = [
    { id: 1, name: 'Квартира', profit: 2670, change: 23.1 },
    { id: 2, name: 'Дом', profit: 0, change: 0 },
    { id: 3, name: 'Офис', profit: -500, change: -5.2 }
  ];

  const projects = projectsData.length > 0 ? projectsData : mockProjects;

  const getProfitColor = (profit) => {
    if (profit > 0) return '#10B981';
    if (profit < 0) return '#EF4444';
    return '#6B7280';
  };

  const getStatusChip = (profit) => {
    if (profit > 0) return { label: 'Прибыль', color: 'success' };
    if (profit < 0) return { label: 'Убыток', color: 'error' };
    return { label: 'Нейтрально', color: 'default' };
  };

  return (
    <Card
      sx={{
        bgcolor: 'background.paper',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08)',
        borderRadius: '12px',
        border: '1px solid #E8EBF1'
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    bgcolor: '#F9FAFB',
                    borderBottom: '1px solid #E8EBF1',
                    py: 1.5,
                    px: 2.5
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280' }}>
                    ПРОЕКТ
                  </Typography>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    bgcolor: '#F9FAFB',
                    borderBottom: '1px solid #E8EBF1',
                    py: 1.5,
                    px: 2.5
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280' }}>
                    ПРИБЫЛЬ
                  </Typography>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    bgcolor: '#F9FAFB',
                    borderBottom: '1px solid #E8EBF1',
                    py: 1.5,
                    px: 2.5
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280' }}>
                    СТАТУС
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project, index) => {
                const status = getStatusChip(project.profit);
                return (
                  <TableRow
                    key={project.id}
                    sx={{
                      '&:last-child td': { borderBottom: 'none' },
                      '&:hover': { bgcolor: '#F9FAFB' },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <TableCell sx={{ py: 2, px: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#111827' }}>
                        {project.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, px: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: getProfitColor(project.profit),
                          fontSize: '0.9375rem'
                        }}
                      >
                        {project.profit > 0 ? '+' : ''}{project.profit?.toLocaleString('ru-RU')} ₽
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, px: 2.5, borderBottom: '1px solid #F3F4F6' }}>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer с итогом */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: '#F9FAFB',
            borderTop: '1px solid #E8EBF1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6B7280' }}>
            ИТОГО
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: getProfitColor(projects.reduce((sum, p) => sum + p.profit, 0))
            }}
          >
            {projects.reduce((sum, p) => sum + p.profit, 0).toLocaleString('ru-RU')} ₽
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SimplifiedProjectsTable;
