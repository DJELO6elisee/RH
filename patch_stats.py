import os

file_path = r"c:\Users\HP\Desktop\All Folder\RH\backend\controllers\AgentsController.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

exclusion = """
            const exclusionCondition = `
                (a.retire IS NULL OR a.retire = false)
                AND (a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite')
                AND ${this.getRetirementExclusionCondition('a', 'g')}
                AND NOT (
                    a.id_type_d_agent = 1
                    AND a.date_de_naissance IS NOT NULL
                    AND g.libele IS NOT NULL
                    AND MAKE_DATE(
                        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                        CASE 
                            WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                            ELSE 60
                        END,
                        12,
                        31
                    )::DATE < CURRENT_DATE::DATE
                )
            `;
"""

def patch_method(content, method_name):
    # Find where the method starts
    method_idx = content.find(method_name)
    if method_idx == -1: return content
    
    # Find block to replace
    block_start = content.find("let whereClause = '';", method_idx)
    block_end = content.find("const query = `", block_start)
    if block_start == -1 or block_end == -1: return content
    
    new_block = f"""let whereClause = '';
            let subQueryWhereClause = '';
            let params = [];
            {exclusion}
            if (userMinistereId) {{
                whereClause = ' WHERE a.id_ministere = $1 AND ' + exclusionCondition;
                subQueryWhereClause = ' WHERE a.id_ministere = $2 AND ' + exclusionCondition;
                params = [userMinistereId, userMinistereId];
            }} else {{
                whereClause = ' WHERE ' + exclusionCondition;
                subQueryWhereClause = ' WHERE ' + exclusionCondition;
            }}

            """
            
    content = content[:block_start] + new_block + content[block_end:]
    
    # Now replace the query inside the method
    query_start = content.find("const query = `", block_start)
    query_end = content.find("`;", query_start) + 2
    old_query = content[query_start:query_end]
    
    # Add JOIN grades to FROM agents
    new_query = old_query.replace("FROM agents a", "FROM agents a\\n                LEFT JOIN grades g ON a.id_grade = g.id")
    
    # And subquery FROM agents to include JOIN and alias a
    new_query = new_query.replace("FROM agents${subQueryWhereClause}", "FROM agents a LEFT JOIN grades g ON a.id_grade = g.id${subQueryWhereClause}")
    
    # In getStatsByDirection, there's FROM agents a -> make sure not to replace twice
    # Actually, just replacing 'FROM agents a' might replace the main query correctly.
    
    content = content[:query_start] + new_query + content[query_end:]
    return content

methods = ['async getStatsByType', 'async getStatsByService', 'async getStatsByDirection', 'async getStatsByOrganization']
for method in methods:
    content = patch_method(content, method)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched successfully")
