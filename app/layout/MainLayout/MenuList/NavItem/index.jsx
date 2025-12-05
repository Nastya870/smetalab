import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import useConfig from 'hooks/useConfig';
import usePermissions from 'hooks/usePermissions';

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function NavItem({ item, level, isParents = false, setSelectedID }) {
  const { checkVisibility } = usePermissions();
  
  // Проверка видимости по разрешениям
  if (item.permission) {
    const isVisible = checkVisibility(item.permission.resource, item.permission.action);
    if (!isVisible) {
      return null; // Скрываем элемент меню
    }
  }
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const ref = useRef(null);

  const { pathname } = useLocation();
  const { borderRadius } = useConfig();

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const isSelected = !!matchPath({ path: item?.link ? item.link : item.url, end: false }, pathname);

  const [hoverStatus, setHover] = useState(false);

  const compareSize = () => {
    const compare = ref.current && ref.current.scrollWidth > ref.current.clientWidth;
    setHover(compare);
  };

  useEffect(() => {
    compareSize();
    window.addEventListener('resize', compareSize);
    window.removeEventListener('resize', compareSize);
  }, []);

  const Icon = item?.icon;
  const itemIcon = item?.icon ? (
    <Icon stroke={1.5} size={drawerOpen ? '20px' : '24px'} style={{ ...(isParents && { fontSize: 20, stroke: '1.5' }) }} />
  ) : (
    <FiberManualRecordIcon sx={{ width: isSelected ? 8 : 6, height: isSelected ? 8 : 6 }} fontSize={level > 0 ? 'inherit' : 'medium'} />
  );

  let itemTarget = '_self';
  if (item.target) {
    itemTarget = '_blank';
  }

  const itemHandler = () => {
    if (downMD) handlerDrawerOpen(false);

    if (isParents && setSelectedID) {
      setSelectedID();
    }
  };

  const iconSelectedColor = 'primary.main';

  return (
    <>
      <ListItemButton
        component={Link}
        to={item.url}
        target={itemTarget}
        disabled={item.disabled}
        disableRipple={!drawerOpen}
        sx={{
          zIndex: 1201,
          borderRadius: '6px',
          mb: 0.25,
          py: 0.75,
          position: 'relative',
          ...(drawerOpen && level !== 1 && { ml: `${level * 18}px` }),
          ...(!drawerOpen && { pl: 1.25 }),
          ...(drawerOpen &&
            level === 1 && {
              '&:hover': {
                bgcolor: 'rgba(103, 80, 164, 0.04)'
              },
              '&.Mui-selected': {
                bgcolor: 'rgba(103, 80, 164, 0.08)',
                // Вертикальная полоса слева
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: '60%',
                  bgcolor: 'primary.main',
                  borderRadius: '0 2px 2px 0'
                },
                '&:hover': {
                  bgcolor: 'rgba(103, 80, 164, 0.12)'
                }
              }
            }),
          ...((!drawerOpen || level !== 1) && {
            py: level === 1 ? 0 : 1,
            '&:hover': {
              bgcolor: 'transparent'
            },
            '&.Mui-selected': {
              '&:hover': {
                bgcolor: 'transparent'
              },
              bgcolor: 'transparent'
            }
          })
        }}
        selected={isSelected}
        onClick={() => itemHandler()}
      >
        <ButtonBase aria-label="theme-icon" sx={{ borderRadius: '6px' }} disableRipple={drawerOpen}>
          <ListItemIcon
            sx={{
              minWidth: 32,
              mr: 1.25,
              color: isSelected ? iconSelectedColor : 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              ...(!drawerOpen &&
                level === 1 && {
                  borderRadius: '8px',
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    bgcolor: 'rgba(103, 80, 164, 0.08)'
                  },
                  ...(isSelected && {
                    bgcolor: 'rgba(103, 80, 164, 0.08)',
                    '&:hover': {
                      bgcolor: 'rgba(103, 80, 164, 0.12)'
                    }
                  })
                })
            }}
          >
            {itemIcon}
          </ListItemIcon>
        </ButtonBase>

        {(drawerOpen || (!drawerOpen && level !== 1)) && (
          <Tooltip title={item.title} disableHoverListener={!hoverStatus}>
            <ListItemText
              primary={
                <Typography
                  ref={ref}
                  noWrap
                  variant="body2"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'primary.main' : 'text.primary',
                    fontSize: '0.875rem'
                  }}
                >
                  {item.title}
                </Typography>
              }
              secondary={
                item.caption && (
                  <Typography variant="caption" gutterBottom sx={{ display: 'block', ...theme.typography.subMenuCaption }}>
                    {item.caption}
                  </Typography>
                )
              }
            />
          </Tooltip>
        )}

        {drawerOpen && item.chip && (
          <Chip
            color={item.chip.color}
            variant={item.chip.variant}
            size={item.chip.size}
            label={item.chip.label}
            avatar={item.chip.avatar && <Avatar>{item.chip.avatar}</Avatar>}
          />
        )}
      </ListItemButton>
    </>
  );
}

NavItem.propTypes = { item: PropTypes.any, level: PropTypes.number, isParents: PropTypes.bool, setSelectedID: PropTypes.func };
