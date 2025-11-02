import React from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material';

// ===== Types =====
export interface BreadcrumbItem {
  id: string;
  label: string;
}

interface BreadcrumbNavProps {
  path: BreadcrumbItem[];
  onNavigate: (itemId: string) => void;
}

// ===== Component =====
export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ path, onNavigate }) => {
  return (
    <Box sx={{ px: 2, py: 1.5, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        maxItems={4}
        itemsBeforeCollapse={1}
        itemsAfterCollapse={2}
      >
        {path.map((item, index) => {
          const isLast = index === path.length - 1;
          const isFirst = index === 0;

          if (isLast) {
            return (
              <Typography
                key={item.id}
                color="text.primary"
                sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}
              >
                {isFirst && <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.id}
              underline="hover"
              color="inherit"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              {isFirst && <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

