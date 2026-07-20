const fs = require('fs');
const path = require('path');

function updateComponent(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // Add state variables
    const stateRegex = /const \[itemsPerPage\] = useState\(5\);/g;
    if (!code.includes('const [totalPages, setTotalPages]')) {
        code = code.replace(stateRegex, `const [itemsPerPage] = useState(5);\n    const [totalPages, setTotalPages] = useState(1);\n    const [totalItems, setTotalItems] = useState(0);\n    const [debouncedAgentFilter, setDebouncedAgentFilter] = useState('');`);
    }

    // Add debounce effect
    const filterStateRegex = /const \[typeFilter, setTypeFilter\] = useState\(''\);/g;
    if (!code.includes('debouncedAgentFilter')) {
        code = code.replace(filterStateRegex, `const [typeFilter, setTypeFilter] = useState('');\n\n    useEffect(() => {\n        const timer = setTimeout(() => {\n            setDebouncedAgentFilter(agentFilter);\n        }, 500);\n        return () => clearTimeout(timer);\n    }, [agentFilter]);`);
    }

    // Update useEffect dependencies
    const useEffectRegex = /useEffect\(\(\) => \{\n\s*loadDocuments\(\);\n\s*\}, \[user\?\.id, filters, typeDemande, includeCertificatPriseService\]\);/g;
    code = code.replace(useEffectRegex, `useEffect(() => {\n        loadDocuments();\n    }, [user?.id, filters, typeDemande, includeCertificatPriseService, currentPage, itemsPerPage, debouncedAgentFilter, typeFilter]);`);

    // Update loadDocuments logic
    const queryParamsRegex = /Object\.keys\(filters\)\.forEach\(key => \{/g;
    if (!code.includes("queryParams.append('page', currentPage);")) {
        code = code.replace(queryParamsRegex, `queryParams.append('page', currentPage);\n            queryParams.append('limit', itemsPerPage);\n            if (debouncedAgentFilter) queryParams.append('search_agent', debouncedAgentFilter);\n            if (typeFilter) queryParams.append('type_document', typeFilter);\n            Object.keys(filters).forEach(key => {`);
    }

    const setDocumentsRegex = /setDocuments\(data\.data \|\| \[\]\);\n\s*setSelectedDocuments\(\[\]\); \/\/ Reset selection when new data loads\n\s*setCurrentPage\(1\); \/\/ Réinitialiser à la première page/g;
    code = code.replace(setDocumentsRegex, `setDocuments(data.data || []);\n                if (data.pagination) {\n                    setTotalPages(data.pagination.totalPages);\n                    setTotalItems(data.pagination.totalItems);\n                } else {\n                    setTotalPages(Math.ceil((data.data || []).length / itemsPerPage) || 1);\n                    setTotalItems((data.data || []).length);\n                }\n                setSelectedDocuments([]);`);

    // Remove setCurrentPage(1) from setDocuments block to prevent infinite loop. It should only reset on filter changes, handled where filters are set.
    
    // Replace filteredDocuments and currentDocuments
    const filterLogicRegex = /\/\/ Application des filtres frontend \(Agent et Type\)[\s\S]*?const currentDocuments = filteredDocuments\.slice\(startIndex, endIndex\);/g;
    code = code.replace(filterLogicRegex, `// Utilisation directe des documents récupérés (pagination serveur)\n    const currentDocuments = documents;`);

    // In Pagination, we use totalPages instead of calculating it
    // Wait, totalPages is already declared as state now, but in the old code it was calculated: const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
    // Which is already removed by the regex above!

    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`Updated ${filePath}`);
}

updateComponent(path.join(__dirname, 'demo-app2/src/components/Documents/DocumentsGenerated.jsx'));
updateComponent(path.join(__dirname, 'ministere-tourisme/src/components/Documents/DocumentsGenerated.jsx'));
