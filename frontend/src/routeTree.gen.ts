/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as SignupImport } from './routes/signup'
import { Route as LoginImport } from './routes/login'
import { Route as ForgotPasswordImport } from './routes/forgot-password'
import { Route as AboutImport } from './routes/about'
import { Route as AuthenticatedImport } from './routes/_authenticated'
import { Route as AuthenticatedIndexImport } from './routes/_authenticated/index'
import { Route as AuthenticatedProfileImport } from './routes/_authenticated/profile'
import { Route as AuthenticatedExpenseImport } from './routes/_authenticated/expense'
import { Route as AuthenticatedCreateExpenseImport } from './routes/_authenticated/create-expense'
import { Route as AuthenticatedAdminImport } from './routes/_authenticated/_admin'
import { Route as AuthenticatedAdminAdminImport } from './routes/_authenticated/_admin/admin'

// Create/Update Routes

const SignupRoute = SignupImport.update({
  path: '/signup',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const ForgotPasswordRoute = ForgotPasswordImport.update({
  path: '/forgot-password',
  getParentRoute: () => rootRoute,
} as any)

const AboutRoute = AboutImport.update({
  path: '/about',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedRoute = AuthenticatedImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedIndexRoute = AuthenticatedIndexImport.update({
  path: '/',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedProfileRoute = AuthenticatedProfileImport.update({
  path: '/profile',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedExpenseRoute = AuthenticatedExpenseImport.update({
  path: '/expense',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedCreateExpenseRoute = AuthenticatedCreateExpenseImport.update(
  {
    path: '/create-expense',
    getParentRoute: () => AuthenticatedRoute,
  } as any,
)

const AuthenticatedAdminRoute = AuthenticatedAdminImport.update({
  id: '/_admin',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedAdminAdminRoute = AuthenticatedAdminAdminImport.update({
  path: '/admin',
  getParentRoute: () => AuthenticatedAdminRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AuthenticatedImport
      parentRoute: typeof rootRoute
    }
    '/about': {
      id: '/about'
      path: '/about'
      fullPath: '/about'
      preLoaderRoute: typeof AboutImport
      parentRoute: typeof rootRoute
    }
    '/forgot-password': {
      id: '/forgot-password'
      path: '/forgot-password'
      fullPath: '/forgot-password'
      preLoaderRoute: typeof ForgotPasswordImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/signup': {
      id: '/signup'
      path: '/signup'
      fullPath: '/signup'
      preLoaderRoute: typeof SignupImport
      parentRoute: typeof rootRoute
    }
    '/_authenticated/_admin': {
      id: '/_authenticated/_admin'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AuthenticatedAdminImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/create-expense': {
      id: '/_authenticated/create-expense'
      path: '/create-expense'
      fullPath: '/create-expense'
      preLoaderRoute: typeof AuthenticatedCreateExpenseImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/expense': {
      id: '/_authenticated/expense'
      path: '/expense'
      fullPath: '/expense'
      preLoaderRoute: typeof AuthenticatedExpenseImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/profile': {
      id: '/_authenticated/profile'
      path: '/profile'
      fullPath: '/profile'
      preLoaderRoute: typeof AuthenticatedProfileImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/': {
      id: '/_authenticated/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedIndexImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/_admin/admin': {
      id: '/_authenticated/_admin/admin'
      path: '/admin'
      fullPath: '/admin'
      preLoaderRoute: typeof AuthenticatedAdminAdminImport
      parentRoute: typeof AuthenticatedAdminImport
    }
  }
}

// Create and export the route tree

interface AuthenticatedAdminRouteChildren {
  AuthenticatedAdminAdminRoute: typeof AuthenticatedAdminAdminRoute
}

const AuthenticatedAdminRouteChildren: AuthenticatedAdminRouteChildren = {
  AuthenticatedAdminAdminRoute: AuthenticatedAdminAdminRoute,
}

const AuthenticatedAdminRouteWithChildren =
  AuthenticatedAdminRoute._addFileChildren(AuthenticatedAdminRouteChildren)

interface AuthenticatedRouteChildren {
  AuthenticatedAdminRoute: typeof AuthenticatedAdminRouteWithChildren
  AuthenticatedCreateExpenseRoute: typeof AuthenticatedCreateExpenseRoute
  AuthenticatedExpenseRoute: typeof AuthenticatedExpenseRoute
  AuthenticatedProfileRoute: typeof AuthenticatedProfileRoute
  AuthenticatedIndexRoute: typeof AuthenticatedIndexRoute
}

const AuthenticatedRouteChildren: AuthenticatedRouteChildren = {
  AuthenticatedAdminRoute: AuthenticatedAdminRouteWithChildren,
  AuthenticatedCreateExpenseRoute: AuthenticatedCreateExpenseRoute,
  AuthenticatedExpenseRoute: AuthenticatedExpenseRoute,
  AuthenticatedProfileRoute: AuthenticatedProfileRoute,
  AuthenticatedIndexRoute: AuthenticatedIndexRoute,
}

const AuthenticatedRouteWithChildren = AuthenticatedRoute._addFileChildren(
  AuthenticatedRouteChildren,
)

export interface FileRoutesByFullPath {
  '': typeof AuthenticatedAdminRouteWithChildren
  '/about': typeof AboutRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/signup': typeof SignupRoute
  '/create-expense': typeof AuthenticatedCreateExpenseRoute
  '/expense': typeof AuthenticatedExpenseRoute
  '/profile': typeof AuthenticatedProfileRoute
  '/': typeof AuthenticatedIndexRoute
  '/admin': typeof AuthenticatedAdminAdminRoute
}

export interface FileRoutesByTo {
  '/about': typeof AboutRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/signup': typeof SignupRoute
  '': typeof AuthenticatedAdminRouteWithChildren
  '/create-expense': typeof AuthenticatedCreateExpenseRoute
  '/expense': typeof AuthenticatedExpenseRoute
  '/profile': typeof AuthenticatedProfileRoute
  '/': typeof AuthenticatedIndexRoute
  '/admin': typeof AuthenticatedAdminAdminRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/_authenticated': typeof AuthenticatedRouteWithChildren
  '/about': typeof AboutRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/signup': typeof SignupRoute
  '/_authenticated/_admin': typeof AuthenticatedAdminRouteWithChildren
  '/_authenticated/create-expense': typeof AuthenticatedCreateExpenseRoute
  '/_authenticated/expense': typeof AuthenticatedExpenseRoute
  '/_authenticated/profile': typeof AuthenticatedProfileRoute
  '/_authenticated/': typeof AuthenticatedIndexRoute
  '/_authenticated/_admin/admin': typeof AuthenticatedAdminAdminRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | ''
    | '/about'
    | '/forgot-password'
    | '/login'
    | '/signup'
    | '/create-expense'
    | '/expense'
    | '/profile'
    | '/'
    | '/admin'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/about'
    | '/forgot-password'
    | '/login'
    | '/signup'
    | ''
    | '/create-expense'
    | '/expense'
    | '/profile'
    | '/'
    | '/admin'
  id:
    | '__root__'
    | '/_authenticated'
    | '/about'
    | '/forgot-password'
    | '/login'
    | '/signup'
    | '/_authenticated/_admin'
    | '/_authenticated/create-expense'
    | '/_authenticated/expense'
    | '/_authenticated/profile'
    | '/_authenticated/'
    | '/_authenticated/_admin/admin'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  AuthenticatedRoute: typeof AuthenticatedRouteWithChildren
  AboutRoute: typeof AboutRoute
  ForgotPasswordRoute: typeof ForgotPasswordRoute
  LoginRoute: typeof LoginRoute
  SignupRoute: typeof SignupRoute
}

const rootRouteChildren: RootRouteChildren = {
  AuthenticatedRoute: AuthenticatedRouteWithChildren,
  AboutRoute: AboutRoute,
  ForgotPasswordRoute: ForgotPasswordRoute,
  LoginRoute: LoginRoute,
  SignupRoute: SignupRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/_authenticated",
        "/about",
        "/forgot-password",
        "/login",
        "/signup"
      ]
    },
    "/_authenticated": {
      "filePath": "_authenticated.tsx",
      "children": [
        "/_authenticated/_admin",
        "/_authenticated/create-expense",
        "/_authenticated/expense",
        "/_authenticated/profile",
        "/_authenticated/"
      ]
    },
    "/about": {
      "filePath": "about.tsx"
    },
    "/forgot-password": {
      "filePath": "forgot-password.tsx"
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/signup": {
      "filePath": "signup.tsx"
    },
    "/_authenticated/_admin": {
      "filePath": "_authenticated/_admin.tsx",
      "parent": "/_authenticated",
      "children": [
        "/_authenticated/_admin/admin"
      ]
    },
    "/_authenticated/create-expense": {
      "filePath": "_authenticated/create-expense.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/expense": {
      "filePath": "_authenticated/expense.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/profile": {
      "filePath": "_authenticated/profile.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/": {
      "filePath": "_authenticated/index.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/_admin/admin": {
      "filePath": "_authenticated/_admin/admin.tsx",
      "parent": "/_authenticated/_admin"
    }
  }
}
ROUTE_MANIFEST_END */
