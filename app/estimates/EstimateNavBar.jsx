import { useState } from 'react';
import PropTypes from 'prop-types';

// material-ui
import {
  Box,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Typography,
  Select,
  FormControl,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  IconSettings,
  IconFileText,
  IconCalendarStats,
  IconShoppingCart,
  IconFiles,
  IconChevronDown,
  IconFileInvoice
} from '@tabler/icons-react';

// ==============================|| ESTIMATE NAV BAR ||============================== //

const EstimateNavBar = ({ activeTab, onTabChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [documentsAnchor, setDocumentsAnchor] = useState(null);
  const documentsOpen = Boolean(documentsAnchor);

  const handleDocumentsClick = (event) => {
    setDocumentsAnchor(event.currentTarget);
  };

  const handleDocumentsClose = () => {
    setDocumentsAnchor(null);
  };

  const handleDocumentSelect = (docType) => {
    onTabChange('documents', docType);
    handleDocumentsClose();
  };

  const handleTabChange = (event, newValue) => {
    // Если это документы, открываем меню
    if (newValue === 'documents') {
      handleDocumentsClick(event);
    } else {
      onTabChange(newValue);
    }
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      {isMobile ? (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <Select
            value={activeTab}
            onChange={(e) => onTabChange(e.target.value)}
            size="small"
          >
            <MenuItem value="parameters">📐 Параметры объекта</MenuItem>
            <MenuItem value="estimate_v2">📄 Смета</MenuItem>
            <MenuItem value="schedule">📅 График</MenuItem>
            <MenuItem value="specialist_estimate">🔨 Выполнение</MenuItem>
            <MenuItem value="purchases">🛒 Закупки</MenuItem>
            <MenuItem value="acts">📋 Акты</MenuItem>
            <MenuItem value="contract">📑 Договор</MenuItem>
          </Select>
        </FormControl>
      ) : (
      <Tabs
        value={activeTab === 'documents' ? false : activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="estimate navigation tabs"
      >
        <Tab
          value="parameters"
          label="Параметры объекта"
          icon={<IconSettings size={18} />}
          iconPosition="start"
          sx={{ minHeight: 56 }}
        />
        <Tab
          value="estimate_v2"
          label="Смета"
          icon={<IconFileText size={18} />}
          iconPosition="start"
          sx={{ minHeight: 56 }}
        />
        <Tab
          value="schedule"
          label="График"
          icon={<IconCalendarStats size={18} />}
          iconPosition="start"
          sx={{ minHeight: 56 }}
        />
        <Tab
          value="specialist_estimate"
          label="Выполнение"
          icon={<IconFileInvoice size={18} />}
          iconPosition="start"
          sx={{ minHeight: 56 }}
        />
        <Tab
          value="purchases"
          label="Закупки"
          icon={<IconShoppingCart size={18} />}
          iconPosition="start"
          sx={{ minHeight: 56 }}
        />
        <Tab
          value="documents"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Документы
              <IconChevronDown size={16} />
            </Box>
          }
          icon={<IconFiles size={18} />}
          iconPosition="start"
          sx={{ minHeight: 56 }}
        />
      </Tabs>

      {/* Выпадающее меню для Документов */}
      <Menu
        anchorEl={documentsAnchor}
        open={documentsOpen}
        onClose={handleDocumentsClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
      >
        <MenuItem onClick={() => handleDocumentSelect('acts')}>
          <Typography>Акты выполненных работ</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleDocumentSelect('contract')}>
          <Typography>Договор</Typography>
        </MenuItem>
      </Menu>
      )
      }
    </Box>
  );
};

EstimateNavBar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired
};

export default EstimateNavBar;
