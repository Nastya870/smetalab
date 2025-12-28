/**
 * Typography Theme Configuration
 * Единая система типографики для Smeta Pro
 * См. полную документацию: docs/TYPOGRAPHY_SYSTEM.md
 */

export default function Typography(theme, borderRadius, fontFamily) {
  return {
    fontFamily: fontFamily || "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    fontSize: 16, // Base size для всего приложения
    htmlFontSize: 16, // Размер корневого элемента
    
    // ========== ЗАГОЛОВКИ (HEADINGS) ==========
    
    // H1 - Главные страницы (32px → 24px mobile)
    h1: {
      fontSize: '2rem', // 32px
      fontWeight: 700,
      lineHeight: 1.2,
      color: theme.palette.grey[900],
      '@media (max-width: 900px)': {
        fontSize: '1.75rem' // 28px tablet
      },
      '@media (max-width: 600px)': {
        fontSize: '1.5rem' // 24px mobile
      }
    },
    
    // H2 - Секции страниц (24px → 20px mobile)
    h2: {
      fontSize: '1.5rem', // 24px
      fontWeight: 700,
      lineHeight: 1.3,
      color: theme.palette.grey[900],
      '@media (max-width: 900px)': {
        fontSize: '1.375rem' // 22px tablet
      },
      '@media (max-width: 600px)': {
        fontSize: '1.25rem' // 20px mobile
      }
    },
    
    // H3 - Подсекции (20px → 18px mobile)
    h3: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.4,
      color: theme.palette.grey[900],
      '@media (max-width: 900px)': {
        fontSize: '1.125rem' // 18px tablet
      },
      '@media (max-width: 600px)': {
        fontSize: '1.125rem' // 18px mobile
      }
    },
    
    // H4 - Карточки и компоненты (18px → 16px mobile)
    h4: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.5,
      color: theme.palette.grey[900],
      '@media (max-width: 600px)': {
        fontSize: '1rem' // 16px mobile
      }
    },
    
    // H5 - Мелкие заголовки (16px)
    h5: {
      fontSize: '1rem', // 16px
      fontWeight: 600,
      lineHeight: 1.5,
      color: theme.palette.grey[900],
      '@media (max-width: 600px)': {
        fontSize: '1rem' // 16px mobile
      }
    },
    
    // H6 - Минимальные заголовки (14px)
    h6: {
      fontSize: '0.875rem', // 14px
      fontWeight: 600,
      lineHeight: 1.5,
      color: theme.palette.grey[900],
      '@media (max-width: 600px)': {
        fontSize: '0.875rem' // 14px mobile
      }
    },
    
    // ========== ОСНОВНОЙ ТЕКСТ (BODY) ==========
    
    // Body1 - Основной текст (16px)
    body1: {
      fontSize: '1rem', // 16px
      fontWeight: 400,
      lineHeight: 1.6,
      color: theme.palette.text.primary,
      '@media (max-width: 600px)': {
        fontSize: '1rem', // 16px mobile (важно для iOS)
        lineHeight: 1.6
      }
    },
    
    // Body2 - Второстепенный текст (14px)
    body2: {
      fontSize: '0.875rem', // 14px
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0em',
      color: theme.palette.text.primary,
      '@media (max-width: 600px)': {
        fontSize: '0.875rem', // 14px mobile
        lineHeight: 1.5
      }
    },
    
    // ========== ПОДЗАГОЛОВКИ (SUBTITLES) ==========
    
    // Subtitle1 - Важные подзаголовки (16px)
    subtitle1: {
      fontSize: '1rem', // 16px
      fontWeight: 500,
      lineHeight: 1.5,
      color: theme.palette.text.dark,
      '@media (max-width: 600px)': {
        fontSize: '1rem' // 16px mobile
      }
    },
    
    // Subtitle2 - Вторичные подзаголовки (14px)
    subtitle2: {
      fontSize: '0.875rem', // 14px
      fontWeight: 500,
      lineHeight: 1.5,
      color: theme.palette.text.secondary,
      '@media (max-width: 600px)': {
        fontSize: '0.875rem' // 14px mobile
      }
    },
    
    // ========== ВСПОМОГАТЕЛЬНЫЙ ТЕКСТ ==========
    
    // Caption - Подписи (12px)
    caption: {
      fontSize: '0.75rem', // 12px
      fontWeight: 400,
      lineHeight: 1.4,
      color: theme.palette.text.secondary,
      '@media (max-width: 600px)': {
        fontSize: '0.75rem' // 12px mobile
      }
    },
    
    // Overline - Надписи (12px uppercase)
    overline: {
      fontSize: '0.75rem', // 12px
      fontWeight: 500,
      lineHeight: 1.4,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: theme.palette.text.secondary,
      '@media (max-width: 600px)': {
        fontSize: '0.75rem' // 12px mobile
      }
    },
    
    // ========== ИНТЕРАКТИВНЫЕ ЭЛЕМЕНТЫ ==========
    
    // Button - Кнопки
    button: {
      fontSize: '0.875rem', // 14px
      fontWeight: 500,
      lineHeight: 1.5,
      textTransform: 'none',
      letterSpacing: '0.3px',
      '@media (max-width: 600px)': {
        fontSize: '1rem', // 16px mobile (лучше для нажатия)
        minHeight: '44px' // Apple HIG touch target
      }
    },
    
    // ========== КАСТОМНЫЕ КОМПОНЕНТЫ ==========
    
    // Custom Input - стилизация полей ввода
    customInput: {
      marginTop: 2.5,
      marginBottom: 2.5,
      '& > label': {
        top: 20,
        left: 0,
        color: theme.palette.grey[500],
        fontSize: '0.875rem', // 14px для лейблов
        fontWeight: 500,
        '@media (max-width: 600px)': {
          fontSize: '0.875rem'
        },
        '&[data-shrink="false"]': {
          top: 12
        },
        '&.Mui-focused': {
          color: theme.palette.primary.main
        }
      },
      '& > div': {
        borderRadius: '12px',
        backgroundColor: '#fff',
        transition: 'all 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          '& fieldset': {
            borderColor: '#A9ACBD !important'
          }
        },
        '&.Mui-focused': {
          boxShadow: '0 0 0 3px rgba(103, 80, 164, 0.15)',
          '& fieldset': {
            borderColor: `${theme.palette.primary.main} !important`,
            borderWidth: '1.5px !important'
          }
        }
      },
      '& > div > input': {
        padding: '26px 14px 10px !important',
        fontSize: '1rem', // 16px для инпутов (iOS zoom prevention)
        fontWeight: 400,
        height: '20px',
        '@media (max-width: 600px)': {
          fontSize: '1rem' // критично для iOS
        }
      },
      '& legend': {
        display: 'none'
      },
      '& fieldset': {
        top: 0,
        borderColor: '#D9DCE9',
        borderWidth: '1px',
        transition: 'border-color 0.2s ease-in-out'
      }
    },
    
    // Main Content - стили основного контента
    mainContent: {
      backgroundColor: theme.palette.grey[100],
      width: '100%',
      minHeight: 'calc(100vh - 88px)',
      flexGrow: 1,
      padding: '20px',
      marginTop: '88px',
      marginRight: '20px',
      borderRadius: `${borderRadius}px`,
      '@media (max-width: 900px)': {
        padding: '16px',
        marginRight: '16px'
      },
      '@media (max-width: 600px)': {
        padding: '12px',
        marginRight: '0',
        marginTop: '64px',
        minHeight: 'calc(100vh - 64px)'
      }
    },
    
    // Menu Caption - заголовки меню
    menuCaption: {
      fontSize: '0.875rem', // 14px
      fontWeight: 600,
      color: theme.palette.grey[900],
      padding: '6px',
      textTransform: 'capitalize',
      marginTop: '10px',
      '@media (max-width: 600px)': {
        fontSize: '1rem' // 16px на мобильных
      }
    },
    
    // Sub Menu Caption - подзаголовки меню
    subMenuCaption: {
      fontSize: '0.75rem', // 12px
      fontWeight: 500,
      color: theme.palette.text.secondary,
      textTransform: 'capitalize',
      '@media (max-width: 600px)': {
        fontSize: '0.875rem' // 14px на мобильных
      }
    },
    
    // ========== СПЕЦИАЛЬНЫЕ ВАРИАНТЫ ДЛЯ ТАБЛИЦ ==========
    
    // Table Header - заголовки таблиц
    tableHeader: {
      fontSize: '0.75rem', // 12px
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      lineHeight: 1.5,
      color: theme.palette.grey[600]
    },
    
    // Table Cell - ячейки таблиц
    tableCell: {
      fontSize: '0.875rem', // 14px
      fontWeight: 400,
      lineHeight: 1.5,
      color: theme.palette.text.primary
    },
    
    // Table Cell Numeric - числовые данные
    tableCellNumeric: {
      fontSize: '0.875rem', // 14px
      fontWeight: 500,
      lineHeight: 1.5,
      fontVariantNumeric: 'tabular-nums',
      color: theme.palette.text.primary
    },
    
    // ========== АВАТАРЫ ==========
    
    commonAvatar: {
      cursor: 'pointer',
      borderRadius: '8px'
    },
    smallAvatar: {
      width: '22px',
      height: '22px',
      fontSize: '1rem'
    },
    mediumAvatar: {
      width: '34px',
      height: '34px',
      fontSize: '1.2rem'
    },
    largeAvatar: {
      width: '44px',
      height: '44px',
      fontSize: '1.5rem'
    }
  };
}
