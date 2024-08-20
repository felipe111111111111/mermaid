import type { GitGraph } from '@mermaid-js/parser';
import { parse } from '@mermaid-js/parser';
import type { ParserDefinition } from '../../diagram-api/types.js';
import { log } from '../../logger.js';
import { populateCommonDb } from '../common/populateCommonDb.js';
import { db } from './gitGraphAst.js';
import { commitType } from './gitGraphTypes.js';
import type {
  CheckoutAst,
  CherryPickingAst,
  MergeAst,
  CommitAst,
  BranchAst,
  GitGraphDBParseProvider,
} from './gitGraphTypes.js';

const populate = (ast: GitGraph, db: GitGraphDBParseProvider) => {
  populateCommonDb(ast, db);
  // @ts-ignore: this wont exist if the direction is not specified
  if (ast.dir) {
    // @ts-ignore: this wont exist if the direction is not specified
    db.setDirection(ast.dir);
  }
  for (const statement of ast.statements) {
    parseStatement(statement, db);
  }
};

const parseStatement = (statement: any, db: GitGraphDBParseProvider) => {
  const parsers: Record<string, (stmt: any) => void> = {
    Commit: (stmt) => db.commit(...parseCommit(stmt)),
    Branch: (stmt) => db.branch(...parseBranch(stmt)),
    Merge: (stmt) => db.merge(...parseMerge(stmt)),
    Checkout: (stmt) => db.checkout(parseCheckout(stmt)),
    CherryPicking: (stmt) => db.cherryPick(...parseCherryPicking(stmt)),
  };

  const parser = parsers[statement.$type];
  if (parser) {
    parser(statement);
  } else {
    log.error(`Unknown statement type: ${statement.$type}`);
  }
};

const parseCommit = (commit: CommitAst): [string, string, number, string[] | undefined] => {
  const id = commit.id;
  const message = commit.message ?? '';
  const type = commit.type !== undefined ? commitType[commit.type] : commitType.NORMAL;
  const tags = commit.tags ?? undefined;

  return [message, id, type, tags];
};

const parseBranch = (branch: BranchAst): [string, number] => {
  const name = branch.name;
  const order = branch.order ?? 0;
  return [name, order];
};

const parseMerge = (
  merge: MergeAst
): [string, string, number | undefined, string[] | undefined] => {
  const branch = merge.branch;
  const id = merge.id ?? '';
  const type = merge.type !== undefined ? commitType[merge.type] : undefined;
  const tags = merge.tags ?? undefined;
  return [branch, id, type, tags];
};

const parseCheckout = (checkout: CheckoutAst): string => {
  const branch = checkout.branch;
  return branch;
};

const parseCherryPicking = (
  cherryPicking: CherryPickingAst
): [string, string, string[] | undefined, string] => {
  const id = cherryPicking.id;
  const tags = cherryPicking.tags?.length === 0 ? undefined : cherryPicking.tags;
  const parent = cherryPicking.parent;
  return [id, '', tags, parent];
};

export const parser: ParserDefinition = {
  parse: async (input: string): Promise<void> => {
    const ast: GitGraph = await parse('gitGraph', input);
    log.debug(ast);
    populate(ast, db);
  },
};

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  const mockDB: GitGraphDBParseProvider = {
    commitType: commitType,
    setDirection: vi.fn(),
    commit: vi.fn(),
    branch: vi.fn(),
    merge: vi.fn(),
    cherryPick: vi.fn(),
    checkout: vi.fn(),
  };

  describe('GitGraph Parser', () => {
    it('should parse a commit statement', () => {
      const commit = {
        $type: 'Commit',
        id: '1',
        message: 'test',
        tags: ['tag1', 'tag2'],
        type: 'NORMAL',
      };
      parseStatement(commit, mockDB);
      expect(mockDB.commit).toHaveBeenCalledWith('test', '1', 0, ['tag1', 'tag2']);
    });
    it('should parse a branch statement', () => {
      const branch = {
        $type: 'Branch',
        name: 'newBranch',
        order: 1,
      };
      parseStatement(branch, mockDB);
      expect(mockDB.branch).toHaveBeenCalledWith('newBranch', 1);
    });
    it('should parse a checkout statement', () => {
      const checkout = {
        $type: 'Checkout',
        branch: 'newBranch',
      };
      parseStatement(checkout, mockDB);
      expect(mockDB.checkout).toHaveBeenCalledWith('newBranch');
    });
    it('should parse a merge statement', () => {
      const merge = {
        $type: 'Merge',
        branch: 'newBranch',
        id: '1',
        tags: ['tag1', 'tag2'],
        type: 'NORMAL',
      };
      parseStatement(merge, mockDB);
      expect(mockDB.merge).toHaveBeenCalledWith('newBranch', '1', 0, ['tag1', 'tag2']);
    });
    it('should parse a cherry picking statement', () => {
      const cherryPick = {
        $type: 'CherryPicking',
        id: '1',
        tags: ['tag1', 'tag2'],
        parent: '2',
      };
      parseStatement(cherryPick, mockDB);
      expect(mockDB.cherryPick).toHaveBeenCalledWith('1', '', ['tag1', 'tag2'], '2');
    });

    it('should parse a langium generated gitGraph ast', () => {
      const dummy: GitGraph = {
        $type: 'GitGraph',
        statements: [],
      };
      const gitGraphAst: GitGraph = {
        $type: 'GitGraph',
        statements: [
          {
            $container: dummy,
            $type: 'Commit',
            id: '1',
            message: 'test',
            tags: ['tag1', 'tag2'],
            type: 'NORMAL',
          },
          {
            $container: dummy,
            $type: 'Branch',
            name: 'newBranch',
            order: 1,
          },
          {
            $container: dummy,
            $type: 'Merge',
            branch: 'newBranch',
            id: '1',
            tags: ['tag1', 'tag2'],
            type: 'NORMAL',
          },
          {
            $container: dummy,
            $type: 'Checkout',
            branch: 'newBranch',
          },
          {
            $container: dummy,
            $type: 'CherryPicking',
            id: '1',
            tags: ['tag1', 'tag2'],
            parent: '2',
          },
        ],
      };

      populate(gitGraphAst, mockDB);

      expect(mockDB.commit).toHaveBeenCalledWith('test', '1', 0, ['tag1', 'tag2']);
      expect(mockDB.branch).toHaveBeenCalledWith('newBranch', 1);
      expect(mockDB.merge).toHaveBeenCalledWith('newBranch', '1', 0, ['tag1', 'tag2']);
      expect(mockDB.checkout).toHaveBeenCalledWith('newBranch');
    });
  });
}
