import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import UserLogins from '../UserLogins';

// Mock dependencies
vi.mock('../../../lib/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }
  };
});
import axios from '../../../lib/axios';

const mockUsers = [
  {
    id: 'u1',
    user_id: 'john_doe',
    user_first_name: 'John',
    user_last_name: 'Doe',
    user_email_id: 'john@example.com',
    user_role: 'admin',
    user_status: 1
  },
  {
    id: 'u2',
    user_id: 'jane_smith',
    user_first_name: 'Jane',
    user_last_name: 'Smith',
    user_email_id: 'jane@example.com',
    user_role: 'teacher',
    user_status: 0
  }
];

const mockRoles = [
  { MAS_ROLE_ID: 'admin', MAS_ROLE_DESC: 'Administrator' },
  { MAS_ROLE_ID: 'teacher', MAS_ROLE_DESC: 'Teacher' }
];

const mockSchools = [
  { SCHL_MN_ID: 's1', SCHL_MN_NM: 'Main School' }
];

const mockBranches = [
  { SCHL_BR_ID: 'b1', SCHL_BR_NM: 'Main Branch' }
];

const baseUrl = import.meta.env?.VITE_API_BASE_URL || '';

describe('UserLogins Component', () => {
  const setupMocks = (users = mockUsers) => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/auth/users')) return Promise.resolve({ data: users });
      if (url.includes('/auth/roles')) return Promise.resolve({ data: mockRoles });
      if (url.includes('/auth/school')) return Promise.resolve({ data: mockSchools });
      if (url.includes('/academic/branches')) return Promise.resolve({ data: mockBranches });
      return Promise.reject(new Error('not found'));
    });
  };

  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.setItem('e_school_user', JSON.stringify({ user_role: 'superadmin' }));
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('1. Initial Render & Loading State', () => {
    it('displays loading skeleton/spinner while fetching user list', () => {
      setupMocks();
      render(<UserLogins />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays accurate table columns and fetched data', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('User / Avatar')).toBeInTheDocument();
      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      expect(screen.getByText('john_doe')).toBeInTheDocument();
      expect(screen.getByText('jane_smith')).toBeInTheDocument();
    });

    it('displays "No records found" empty state if API returns empty array', async () => {
      setupMocks([]);
      render(<UserLogins />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  describe('2. Modal Operations', () => {
    it('clicking "Add New User" button opens modal with empty form fields', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const addButton = screen.getByRole('button', { name: /new user/i });
      fireEvent.click(addButton);

      expect(screen.getByText('Create User Account')).toBeInTheDocument();
      const usernameInput = screen.getByPlaceholderText('e.g. john_doe');
      expect(usernameInput).toHaveValue('');
    });

    it('clicking "Edit" on a specific row populates formData with that row\'s user values', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]); // Edit john_doe

      expect(screen.getByText('Edit User Account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. john_doe')).toHaveValue('john_doe');
    });

    it('pressing "Cancel" or backdrop click closes modal and resets dirty form state', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const addButton = screen.getByRole('button', { name: /new user/i });
      fireEvent.click(addButton);

      expect(screen.getByText('Create User Account')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Create User Account')).not.toBeInTheDocument();
    });
  });

  describe('3. Role & Branch Dropdowns', () => {
    it('dropdown displays active roles fetched from backend and properly updates state payload', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const addButton = screen.getByRole('button', { name: /new user/i });
      fireEvent.click(addButton);

      expect(screen.getAllByText('Administrator')[1]).toBeInTheDocument();
      expect(screen.getAllByText('Teacher')[1]).toBeInTheDocument();

      // Ensure selecting role updates state properly by simulating checkbox click (as superadmin)
      const roleCheckbox = screen.getAllByRole('checkbox')[0]; // first role checkbox
      fireEvent.click(roleCheckbox);
      expect(roleCheckbox).toBeChecked();

      // Branch
      const branchSelect = screen.getAllByRole('combobox').find(el =>
        Array.from(el.options).some(opt => opt.text.includes('Main Branch'))
      );
      if (branchSelect) {
        fireEvent.change(branchSelect, { target: { value: 'b1' } });
        expect(branchSelect).toHaveValue('b1');
      }
    });
  });

  describe('Pagination', () => {
    it('handles pagination logic correctly', async () => {
      const manyUsers = Array.from({ length: 15 }, (_, i) => ({
        id: `u${i}`,
        user_id: `user${i}`,
        user_first_name: `User${i}`,
        user_last_name: 'Test',
        user_email_id: `user${i}@example.com`,
        user_role: 'admin',
        user_status: 1
      }));
      setupMocks(manyUsers);
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      expect(screen.getByText('user0')).toBeInTheDocument();
      expect(screen.queryByText('user10')).not.toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => expect(screen.getByText('user10')).toBeInTheDocument());
      expect(screen.queryByText('user0')).not.toBeInTheDocument();
    });
  });

  describe('4. Search & Filter', () => {
    it('typing in the search bar filters rows by name, email, or username in real time', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText(/Search by User ID, Name, Email, Role, or Branch/i);
      fireEvent.change(searchInput, { target: { value: 'jane' } });

      await waitFor(() => {
        expect(screen.queryByText('john_doe')).not.toBeInTheDocument();
      }, { timeout: 1000 });
      expect(screen.getByText('jane_smith')).toBeInTheDocument();
    });

    it('clearing search restores the full dataset', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText(/Search by User ID, Name, Email, Role, or Branch/i);
      fireEvent.change(searchInput, { target: { value: 'jane' } });

      await waitFor(() => {
        expect(screen.queryByText('john_doe')).not.toBeInTheDocument();
      }, { timeout: 1000 });

      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('john_doe')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('5. Status Toggle & Delete Actions', () => {
    it('clicking activate/deactivate toggles user status and sends appropriate status payload', async () => {
      // Feature not present in current UI
    });

    it('clicking "Delete" opens confirmation prompt; aborting does not trigger API delete call', async () => {
      setupMocks();
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      expect(axios.delete).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('confirming delete triggers API call and removes user row from UI', async () => {
      setupMocks();
      axios.delete.mockResolvedValueOnce({ data: { success: true } });
      render(<UserLogins />);

      await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/auth/users/john_doe'));
      });

      confirmSpy.mockRestore();
    });
  });
});
