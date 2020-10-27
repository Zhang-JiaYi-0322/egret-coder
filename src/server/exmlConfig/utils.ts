import * as ts from "./typescript_inner";

export function getClassExtendsHeritageClauseElement(node: ts.ClassLikeDeclaration) {
    let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
    return heritageClause && heritageClause.types.length > 0 ? heritageClause.types[0] : undefined;
}

export function getClassImplementsHeritageClauseElements(node: ts.ClassLikeDeclaration) {
    let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ImplementsKeyword);
    return heritageClause ? heritageClause.types : undefined;
}

export function getInterfaceBaseTypeNodes(node: ts.InterfaceDeclaration) {
    let heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
    return heritageClause ? heritageClause.types : undefined;
}

export function getHeritageClause(clauses: ts.NodeArray<ts.HeritageClause>, kind: ts.SyntaxKind) {
    if (clauses) {
        for (let clause of clauses) {
            if (clause.token === kind) {
                return clause;
            }
        }
    }
    return undefined;
}

export function getImplementedInterfaces(type: ts.Type, checker: ts.TypeChecker) {
    var superInterfaces = null;
    var result: Array<ts.ObjectType> = [];

    if (type.symbol.declarations) {
        type.symbol.declarations.forEach(node => {
            var interfaceType = checker.getTypeAtLocation(node);
						var flags = (<ts.ObjectType>interfaceType).objectFlags;
						var isClass = 0;
						if(flags){
							isClass = flags & ts.ObjectFlags.Class;
						}
            if (isClass) {
                superInterfaces = getClassImplementsHeritageClauseElements(<ts.ClassLikeDeclaration>node);
            } else {
                superInterfaces = getInterfaceBaseTypeNodes(<ts.InterfaceDeclaration>node);
            }
            if (superInterfaces) {
                superInterfaces.forEach(sp => {
                    interfaceType = checker.getTypeAtLocation(sp);
										var flags = (<ts.ObjectType>interfaceType).objectFlags;
										if (flags && (flags & ts.ObjectFlags.Interface)) {
                        result.push(<ts.ObjectType>interfaceType);
                    }
                });
            }
        });
    }
    return result;
}

export function getFullyQualifiedName(symbol: ts.Symbol, checker: ts.TypeChecker): string {
    var parent = symbol['parent'];
    var parentIsFile: boolean = false;
    if (parent && parent.declarations && parent.declarations.length === 1) {
        var fileObject = parent.declarations[0];
        if (fileObject && fileObject['fileName']) {
            parentIsFile = true;
        }
    }
    return symbol['parent'] && !parentIsFile ? getFullyQualifiedName(symbol['parent'], checker) + '.' + checker.symbolToString(symbol) : checker.symbolToString(symbol);
}