const files = [
  'app/counterparties/CounterpartyModal.jsx',
  'app/references/materials/MaterialDialog.jsx',
  'app/references/works/WorkDialog.jsx',
  'app/estimates/CreateEstimateDialog.jsx',
  'app/admin/users/UserDialog.jsx',
  'shared/ui/contracts/CounterpartySelectorDialog.jsx'
];

const fs = require('fs');
const path = require('path');

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(  Skip: ${file} not found);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if already has useMediaQuery
  if (content.includes('useMediaQuery') && content.includes('isMobile')) {
    console.log( Skip: ${file} already adapted);
    return;
  }

  // Add imports if not present
  if (!content.includes('useMediaQuery')) {
    content = content.replace(
      /from '@mui\/material';/,
      , useMediaQuery, useTheme} from '@mui/material';
    );
    modified = true;
  }

  // Add theme and isMobile hooks in component
  const componentMatch = content.match(/const \w+ = \(\{[^}]*\}\) => \{/);
  if (componentMatch) {
    const hookCode = \n  const theme = useTheme();\n  const isMobile = useMediaQuery(theme.breakpoints.down('md'));\n;
    content = content.replace(componentMatch[0], componentMatch[0] + hookCode);
    modified = true;
  }

  // Update Dialog props
  content = content.replace(
    /<Dialog\s+([^>]*?)>/g,
    (match, props) => {
      if (props.includes('fullScreen=')) return match;
      return <Dialog \n      ${props.trim()}\n      fullScreen={isMobile}\n      sx={{\n        '& .MuiDialog-paper': {\n          m: isMobile ? 0 : 2,\n          maxHeight: isMobile ? '100%' : 'calc(100% - 64px)'\n        }\n      }}\n    >;
    }
  );

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log( Adapted: ${file}`);
  }
});
