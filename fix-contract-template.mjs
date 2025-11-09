import fs from 'fs/promises';
import path from 'path';

async function fixContractTemplate() {
  const templatePath = path.join(process.cwd(), 'server/templates/contract-template.json');
  
  // Читаем шаблон
  const content = await fs.readFile(templatePath, 'utf-8');
  const template = JSON.parse(content);
  
  const sections = template.sections;
  const fixed = [];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Если это heading2 или heading3 с только номером (например "2.1." или "2.1.1.")
    if ((section.type === 'heading2' || section.type === 'heading3') && 
        /^\d+\.(\d+\.)*$/.test(section.content.trim())) {
      
      // Смотрим следующую секцию
      const nextSection = sections[i + 1];
      
      if (nextSection && nextSection.type === 'paragraph') {
        // Объединяем: номер + текст
        fixed.push({
          type: 'paragraph',
          content: section.content.trim() + ' ' + nextSection.content,
          ...(nextSection.align && { align: nextSection.align }),
          ...(nextSection.bold && { bold: nextSection.bold })
        });
        
        // Пропускаем следующую секцию, так как мы её уже объединили
        i++;
        continue;
      }
    }
    
    // Если это heading2 или heading3 с номером и текстом (например "1.1. Сторона-1")
    if ((section.type === 'heading2' || section.type === 'heading3') && 
        /^\d+\.(\d+\.)*\s+.+/.test(section.content)) {
      // Преобразуем в paragraph
      fixed.push({
        type: 'paragraph',
        content: section.content,
        ...(section.align && { align: section.align })
      });
      continue;
    }
    
    // Остальные секции оставляем как есть
    fixed.push(section);
  }
  
  template.sections = fixed;
  
  // Сохраняем исправленный шаблон
  await fs.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf-8');
  
  console.log('✅ Шаблон исправлен!');
  console.log(`   Секций до: ${sections.length}`);
  console.log(`   Секций после: ${fixed.length}`);
}

fixContractTemplate().catch(console.error);
