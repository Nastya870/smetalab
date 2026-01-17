import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  CircularProgress,
  Tooltip,
  IconButton,
  Grid,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  IconSearch,
  IconPackage,
  IconRefresh,
  IconChevronRight,
  IconChevronDown,
  IconFolder,
  IconFolderOpen,
  IconX
} from '@tabler/icons-react';
import { Virtuoso } from 'react-virtuoso';
import { formatCurrency } from '../../projects/utils';
import useCategoriesTree from 'shared/lib/hooks/useCategoriesTree';

// --- Category Tree Item Component ---
const CategoryTreeItem = ({ node, level = 0, selectedCategory, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  // Auto-expand if a child is selected
  useEffect(() => {
    // Simple check: if active category contains this node's path name. 
    // Actual implementation depends on full paths.
    // For now manual expand.
  }, [selectedCategory]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleClick = () => {
    onSelect(node);
  };

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        selected={selectedCategory === node.name}
        sx={{
          pl: level * 2 + 1,
          py: 0.5,
          minHeight: 28,
          '&.Mui-selected': {
            bgcolor: 'primary.lighter',
            color: 'primary.main',
            '&:hover': { bgcolor: 'primary.lighter' },
            '& .MuiListItemIcon-root': { color: 'primary.main' }
          }
        }}
      >
        {hasChildren ? (
          <Box
            component="span"
            onClick={handleToggle}
            sx={{
              mr: 1,
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              opacity: 0.7,
              '&:hover': { opacity: 1, color: 'primary.main' }
            }}
          >
            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </Box>
        ) : (
          <Box sx={{ width: 14, mr: 1 }} /> // Spacer
        )}

        <ListItemIcon sx={{ minWidth: 24 }}>
          {expanded ? <IconFolderOpen size={16} /> : <IconFolder size={16} />}
        </ListItemIcon>

        <ListItemText
          primary={node.name}
          primaryTypographyProps={{
            fontSize: '0.8125rem',
            fontWeight: selectedCategory === node.name ? 600 : 400,
            noWrap: true
          }}
        />
      </ListItemButton>

      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {node.children.map((child) => (
              <CategoryTreeItem
                key={child.id}
                node={child}
                level={level + 1}
                selectedCategory={selectedCategory}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

// --- Main Dialog Component ---
const MaterialsDialog = ({
  open,
  mode,
  items,
  totalCountText,
  loading,
  searchQuery,
  hasMore,
  loadMoreRef,
  onClose,
  onSearchChange, // Parent handler for general search
  onSelect,
  syncStatus,
  onSync,
  onSearch // Direct search trigger
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Local state for input
  const [localSearchInput, setLocalSearchInput] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch categories using our new hook
  const { tree: categoriesTree, loading: loadingCategories } = useCategoriesTree('material');

  // Sync local search
  useEffect(() => {
    setLocalSearchInput(searchQuery);
  }, [searchQuery]);

  // Handle category selection
  const handleCategorySelect = (node) => {
    // If clicking same category, deselect it? Or just strict select.
    if (selectedCategory === node.name) {
      setSelectedCategory(null);
      if (onSearch) onSearch(""); // Reset search
    } else {
      setSelectedCategory(node.name);
      // Trigger parent search with category filter
      // We assume onSearch accepts string. Parent parses it? 
      // Or we should update parent to accept options object.
      // For now, let's pass a special prefix "category:" if parent handles it,
      // OR rely on parent having `onCategoryChange` (which we should add).
      // Since we are modifing existing component:
      // Let's assume onSearch is general. 
      // Force text search for now: "category:Name"
      if (onSearch) onSearch(`category:${node.name}`);
    }
  };

  const handleClearCategory = () => {
    setSelectedCategory(null);
    if (onSearch) onSearch("");
  };

  // Компонент строки для виртуализации (Dense/Compact)
  const Row = (index, material) => (
    <ListItem
      key={material.id}
      disablePadding
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background 0.1s'
      }}
    >
      <ListItemButton
        onClick={() => onSelect(material)}
        sx={{ py: 0.5, px: 2, height: 44 }} // Reduced height: 44px
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          {material.image ? (
            <Box
              component="img"
              loading="lazy"
              src={material.image}
              alt=""
              sx={{ width: 28, height: 28, borderRadius: 0.5, objectFit: 'cover', bgcolor: '#f0f0f0' }}
            />
          ) : (
            <IconPackage size={20} color={theme.palette.text.disabled} />
          )}
        </ListItemIcon>

        <ListItemText
          primaryTypographyProps={{ component: 'div' }}
          secondaryTypographyProps={{ component: 'div' }}
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', lineHeight: 1.2 }}>
                {material.name}
              </Typography>
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                {material.unit}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>•</Typography>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.75rem' }}>
                {formatCurrency(material.price)}
              </Typography>
            </Box>
          }
        />

        {/* Quick Add Button or Icon could go here */}
      </ListItemButton>
    </ListItem>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md" // Reduced to md per request
      fullWidth
      PaperProps={{
        sx: {
          height: '85vh', // Increased height
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ p: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
            {mode === 'add' ? 'Добавить материал' : 'Заменить материал'}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {loading && <CircularProgress size={16} />}
            <Chip
              label={totalCountText || '0'}
              size="small"
              color="primary"
              variant="soft"
              sx={{ borderRadius: 1, height: 20, fontSize: '0.75rem' }}
            />
            <IconButton size="small" onClick={onClose}><IconChevronDown size={20} /></IconButton>
          </Stack>
        </Box>

        {/* Global Search Bar */}
        <TextField
          fullWidth
          size="small"
          placeholder="Поиск материала (Enter)..."
          value={localSearchInput}
          onChange={(e) => setLocalSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSearch) {
              e.preventDefault();
              onSearch(localSearchInput);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} color="#9CA3AF" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {localSearchInput && (
                  <IconButton size="small" onClick={() => { setLocalSearchInput(''); if (onSearch) onSearch(''); }}>
                    <IconX size={16} />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => onSearch && onSearch(localSearchInput)}
                  disabled={loading}
                  color="primary"
                >
                  {loading ? <CircularProgress size={16} /> : <IconSearch size={18} />}
                </IconButton>
              </InputAdornment>
            ),
            sx: { borderRadius: 2, bgcolor: '#F9FAFB', fontSize: '0.875rem' }
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden', height: '100%' }}>
        {/* LEFT SIDEBAR: Categories Tree */}
        {!isMobile && (
          <Box sx={{
            width: 260,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#F8F9FA',
            overflowY: 'auto'
          }}>
            <Box sx={{ p: 1.5, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Категории
              </Typography>
              <Tooltip title="Синхронизировать материалы и категории">
                <IconButton
                  size="small"
                  onClick={() => onSync ? onSync() : window.location.reload()}
                  disabled={syncStatus === 'syncing'}
                  sx={{ opacity: 0.6 }}
                >
                  <IconRefresh size={14} />
                </IconButton>
              </Tooltip>
            </Box>

            <List dense sx={{ px: 1 }}>
              {/* "All" item */}
              <ListItemButton
                selected={!selectedCategory}
                onClick={handleClearCategory}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}><IconPackage size={16} /></ListItemIcon>
                <ListItemText primary="Все материалы" primaryTypographyProps={{ fontSize: '0.8125rem' }} />
              </ListItemButton>

              {loadingCategories ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : (
                categoriesTree.map(node => (
                  <CategoryTreeItem
                    key={node.id}
                    node={node}
                    selectedCategory={selectedCategory}
                    onSelect={handleCategorySelect}
                  />
                ))
              )}
            </List>
          </Box>
        )}

        {/* RIGHT CONTENT: Material List */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
          {/* Selected Category Header (Breadcrumb-ish) */}
          {selectedCategory && (
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {selectedCategory}
              </Typography>
            </Box>
          )}

          {/* List */}
          <Box sx={{ flex: 1 }}>
            {items.length === 0 && !loading ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">Нет материалов</Typography>
              </Box>
            ) : (
              <Virtuoso
                style={{ height: '100%' }}
                data={items}
                itemContent={Row}
                components={{
                  Footer: () => hasMore ? (
                    <Box ref={loadMoreRef} sx={{ height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {loading && <CircularProgress size={20} />}
                    </Box>
                  ) : null
                }}
              />
            )}
          </Box>
        </Box>
      </DialogContent>

      {/* Remove standard actions or keep Cancel only */}
      {/* <DialogActions /> */}
    </Dialog>
  );
};

MaterialsDialog.propTypes = {
  // ... props unchanged (mostly)
  open: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['add', 'replace']).isRequired,
  items: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  totalCountText: PropTypes.string
};

export default MaterialsDialog;
