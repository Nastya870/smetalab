export default function Typography(theme, borderRadius, fontFamily) {
  return {
    fontFamily,
    h6: {
      fontWeight: 500,
      color: theme.palette.grey[900],
      fontSize: '0.875rem', // Увеличено с 0.75rem для лучшей читаемости
      '@media (max-width: 600px)': {
        fontSize: '0.875rem' // 14px на мобильных
      }
    },
    h5: {
      fontSize: '0.875rem',
      color: theme.palette.grey[900],
      fontWeight: 500,
      '@media (max-width: 600px)': {
        fontSize: '1rem' // 16px на мобильных
      }
    },
    h4: {
      fontSize: '1rem',
      color: theme.palette.grey[900],
      fontWeight: 600,
      '@media (max-width: 600px)': {
        fontSize: '1.125rem' // 18px на мобильных
      }
    },
    h3: {
      fontSize: '1.25rem',
      color: theme.palette.grey[900],
      fontWeight: 600,
      '@media (max-width: 900px)': {
        fontSize: '1.125rem' // 18px на планшетах
      },
      '@media (max-width: 600px)': {
        fontSize: '1.125rem' // 18px на мобильных
      }
    },
    h2: {
      fontSize: '1.5rem',
      color: theme.palette.grey[900],
      fontWeight: 700,
      '@media (max-width: 900px)': {
        fontSize: '1.375rem' // 22px на планшетах
      },
      '@media (max-width: 600px)': {
        fontSize: '1.25rem' // 20px на мобильных
      }
    },
    h1: {
      fontSize: '2.125rem',
      color: theme.palette.grey[900],
      fontWeight: 700,
      '@media (max-width: 900px)': {
        fontSize: '1.75rem' // 28px на планшетах
      },
      '@media (max-width: 600px)': {
        fontSize: '1.5rem' // 24px на мобильных
      }
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: theme.palette.text.dark,
      '@media (max-width: 600px)': {
        fontSize: '1rem' // 16px на мобильных для лучшей читаемости
      }
    },
    subtitle2: {
      fontSize: '0.8125rem', // Увеличено с 0.75rem
      fontWeight: 400,
      color: theme.palette.text.secondary,
      '@media (max-width: 600px)': {
        fontSize: '0.875rem' // 14px на мобильных (минимум читаемости)
      }
    },
    caption: {
      fontSize: '0.8125rem', // Увеличено с 0.75rem (12px было слишком мелко)
      color: theme.palette.text.secondary,
      fontWeight: 400,
      '@media (max-width: 600px)': {
        fontSize: '0.875rem' // 14px на мобильных
      }
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: '1.5', // Увеличено для лучшей читаемости
      '@media (max-width: 600px)': {
        fontSize: '1rem', // 16px на мобильных - стандарт для комфортного чтения
        lineHeight: '1.6'
      }
    },
    body2: {
      fontSize: '0.875rem',
      letterSpacing: '0em',
      fontWeight: 400,
      lineHeight: '1.5em',
      color: theme.palette.text.primary,
      '@media (max-width: 600px)': {
        fontSize: '0.9375rem', // 15px на мобильных
        lineHeight: '1.6'
      }
    },
    button: {
      textTransform: 'capitalize',
      fontSize: '0.875rem',
      '@media (max-width: 600px)': {
        fontSize: '1rem', // 16px на мобильных для лучшего нажатия
        minHeight: '44px' // Минимум для touch target (Apple HIG)
      }
    },
    customInput: {
      marginTop: 2.5,
      marginBottom: 2.5,
      '& > label': {
        top: 20,
        left: 0,
        color: theme.palette.grey[500],
        fontSize: '0.95rem',
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
        fontSize: '0.95rem',
        height: '20px'
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
        marginTop: '64px', // Уменьшенный отступ для мобильных
        minHeight: 'calc(100vh - 64px)'
      }
    },
    menuCaption: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: theme.palette.grey[900],
      padding: '6px',
      textTransform: 'capitalize',
      marginTop: '10px',
      '@media (max-width: 600px)': {
        fontSize: '1rem' // 16px на мобильных для лучшей видимости меню
      }
    },
    subMenuCaption: {
      fontSize: '0.8125rem', // Увеличено с 0.6875rem (было слишком мелко)
      fontWeight: 500,
      color: theme.palette.text.secondary,
      textTransform: 'capitalize',
      '@media (max-width: 600px)': {
        fontSize: '0.875rem' // 14px на мобильных
      }
    },
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
