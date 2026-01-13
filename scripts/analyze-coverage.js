
import fs from 'fs';
import path from 'path';

const coveragePath = path.resolve('coverage/coverage-final.json');

try {
    if (!fs.existsSync(coveragePath)) {
        console.log('❌ Coverage report not found. Run "npm run test:coverage" first.');
        process.exit(1);
    }

    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

    const folders = {};

    Object.keys(coverageData).forEach(filePath => {
        // Normalize path to use forward slashes and relative path
        const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
        const folder = path.dirname(relativePath);

        if (!folders[folder]) {
            folders[folder] = {
                totalStatements: 0,
                coveredStatements: 0,
                totalFunctions: 0,
                coveredFunctions: 0,
                totalBranches: 0,
                coveredBranches: 0
            };
        }

        const fileCov = coverageData[filePath];

        // Statements
        const statements = Object.keys(fileCov.s);
        folders[folder].totalStatements += statements.length;
        folders[folder].coveredStatements += statements.filter(id => fileCov.s[id] > 0).length;

        // Functions
        const functions = Object.keys(fileCov.f);
        folders[folder].totalFunctions += functions.length;
        folders[folder].coveredFunctions += functions.filter(id => fileCov.f[id] > 0).length;

        // Branches
        const branches = Object.keys(fileCov.b);
        folders[folder].totalBranches += branches.length;
        folders[folder].coveredBranches += branches.filter(id => {
            // Branch coverage is array of counts
            return fileCov.b[id][0] > 0;
        }).length;
    });

    console.log('📊 Детальный отчет по покрытию Backend (server/):\n');
    console.log('| Папка | Statements % | Functions % | Branches % |');
    console.log('|---|---|---|---|');

    // ФИЛЬТР: только папки начинающиеся с 'server'
    Object.entries(folders)
        .filter(([folder]) => folder.startsWith('server'))
        .map(([folder, stats]) => {
            const stmtPct = stats.totalStatements ? Math.round((stats.coveredStatements / stats.totalStatements) * 100) : 0;
            const funcPct = stats.totalFunctions ? Math.round((stats.coveredFunctions / stats.totalFunctions) * 100) : 0;
            const branchPct = stats.totalBranches ? Math.round((stats.coveredBranches / stats.totalBranches) * 100) : 0;
            return { folder, stmtPct, funcPct, branchPct, totalStatements: stats.totalStatements };
        })
        .sort((a, b) => a.stmtPct - b.stmtPct) // Сортируем от худшего к лучшему
        .forEach(item => {
            // Подсвечиваем красным если покрытие < 50%
            const mark = item.stmtPct < 50 ? '🔴' : (item.stmtPct < 80 ? '🟡' : '🟢');
            console.log(`| ${mark} **${item.folder}** | ${item.stmtPct}% | ${item.funcPct}% | ${item.branchPct}% |`);
        });

} catch (error) {
    console.error('Error analyzing coverage:', error);
}
