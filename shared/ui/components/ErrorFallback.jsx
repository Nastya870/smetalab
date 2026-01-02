/**
 * Error Fallback UI
 * Default fallback component displayed when ErrorBoundary catches an error
 */

import React from 'react';

const ErrorFallback = ({ error, errorInfo, resetError }) => {
  const isDevelopment = import.meta.env.MODE === 'development';

  return (
    <div
      style={{
        padding: '2rem',
        margin: '2rem auto',
        maxWidth: '600px',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        backgroundColor: '#f8d7da',
        color: '#721c24'
      }}
    >
      <h2 style={{ marginTop: 0 }}>⚠️ Что-то пошло не так</h2>
      
      <p>
        Произошла ошибка при отображении этого компонента. 
        Попробуйте перезагрузить страницу или вернуться назад.
      </p>

      {resetError && (
        <button
          onClick={resetError}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
            backgroundColor: '#721c24',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Попробовать снова
        </button>
      )}

      <button
        onClick={() => window.location.href = '/'}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#fff',
          color: '#721c24',
          border: '1px solid #721c24',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Вернуться на главную
      </button>

      {isDevelopment && error && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            Детали ошибки (dev mode)
          </summary>
          <pre
            style={{
              marginTop: '0.5rem',
              padding: '1rem',
              backgroundColor: '#fff',
              border: '1px solid #721c24',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem'
            }}
          >
            {error.toString()}
            {error.stack && `\n\n${error.stack}`}
            {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ErrorFallback;
