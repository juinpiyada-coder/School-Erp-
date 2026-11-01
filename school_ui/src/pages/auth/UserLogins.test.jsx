import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserLogins from './UserLogins'
import { expect, test, vi, beforeEach } from 'vitest'
import axios from '../../lib/axios'

vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

beforeEach(() => {
  vi.clearAllMocks()
  axios.get.mockImplementation((url) => {
    if (url.includes('/auth/roles')) {
      return Promise.resolve({
        data: [
          { MAS_ROLE_ID: 'R_STUDENT', MAS_ROLE_DESC: 'Student' }
        ]
      })
    }
    return Promise.resolve({ data: [] })
  })
})

test('Name Sanitization: Strips numbers, special chars, and emojis', async () => {
  render(<UserLogins />)
  const user = userEvent.setup()

  await waitFor(() => screen.getByText(/New User Account/i))
  await user.click(screen.getByText(/New User Account/i))

  const firstNameInput = await screen.findByPlaceholderText('e.g. John')
  const lastNameInput = await screen.findByPlaceholderText('e.g. Doe')

  await user.type(firstNameInput, 'John123')
  expect(firstNameInput.value).toBe('John')

  await user.type(lastNameInput, 'Doe@#$%')
  expect(lastNameInput.value).toBe('Doe')

  await user.clear(firstNameInput)
  await user.type(firstNameInput, 'Mary Jane')
  expect(firstNameInput.value).toBe('Mary Jane')

  await user.clear(firstNameInput)
  await user.click(firstNameInput)
  await user.paste('John 🎉')
  expect(firstNameInput.value).toBe('John ')
})

test('Email Sanitization & Constraints', async () => {
  render(<UserLogins />)
  const user = userEvent.setup()

  await waitFor(() => screen.getByText(/New User Account/i))
  await user.click(screen.getByText(/New User Account/i))

  const emailInput = screen.getByPlaceholderText('e.g. john@school.edu')

  await user.type(emailInput, 'John.Doe@School.Edu')
  expect(emailInput.value).toBe('john.doe@school.edu')

  await user.clear(emailInput)
  await user.type(emailInput, 'john2026@school.edu')
  expect(emailInput.value).toBe('john@school.edu')

  await user.clear(emailInput)
  await user.type(emailInput, 'john$!#&@school.edu')
  expect(emailInput.value).toBe('john@school.edu')

  await user.clear(emailInput)
  await user.type(emailInput, 'john@@school.edu')

  const form = screen.getByRole('button', { name: /Save User/i }).closest('form')
  form.noValidate = true;
  await user.click(screen.getByRole('button', { name: /Save User/i }))

  await waitFor(() => {
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument()
  })

  await user.clear(emailInput)
  await user.type(emailInput, 'john@school.edu.')
  await user.click(screen.getByRole('button', { name: /Save User/i }))

  await waitFor(() => {
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument()
  })
})

test('Mobile / Contact Sanitization', async () => {
  render(<UserLogins />)
  const user = userEvent.setup()

  await waitFor(() => screen.getByText(/New User Account/i))
  await user.click(screen.getByText(/New User Account/i))

  const mobileInput = screen.getByPlaceholderText('e.g. +1234567890')

  await user.type(mobileInput, 'abc!@#1234567890')
  expect(mobileInput.value).toBe('1234567890')

  const form = screen.getByRole('button', { name: /Save User/i }).closest('form')
  form.noValidate = true;

  await user.clear(mobileInput)
  await user.type(mobileInput, '123')
  await user.click(screen.getByRole('button', { name: /Save User/i }))

  await waitFor(() => {
    expect(screen.getByText(/Mobile number must be between 10 to 15 digits/i)).toBeInTheDocument()
  })

  await user.clear(mobileInput)
  await user.type(mobileInput, '12345678901234567')
  await user.click(screen.getByRole('button', { name: /Save User/i }))

  await waitFor(() => {
    expect(screen.getByText(/Mobile number must be between 10 to 15 digits/i)).toBeInTheDocument()
  })
})

test('Form Submission Boundary Checks', async () => {
  render(<UserLogins />)
  const user = userEvent.setup()

  await waitFor(() => screen.getByText(/New User Account/i))
  await user.click(screen.getByText(/New User Account/i))

  const saveButton = screen.getByRole('button', { name: /Save User/i })

  // prevent HTML5 validation by finding the form and removing the required attribute
  const form = screen.getByRole('button', { name: /Save User/i }).closest('form')
  form.noValidate = true;

  await user.click(saveButton)

  await waitFor(() => {
    expect(screen.getByText(/User ID is required/i)).toBeInTheDocument()
    expect(screen.getByText(/Email address is required/i)).toBeInTheDocument()
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
    expect(screen.getByText(/Please select a role/i)).toBeInTheDocument()
  })

  const userIdInput = screen.getByPlaceholderText('e.g. john_doe')
  await user.type(userIdInput, 'john_doe')

  const emailInput = screen.getByPlaceholderText('e.g. john@school.edu')
  await user.type(emailInput, 'john@school.edu')

  const pwInput = form.querySelector('input[type="password"]')
  await user.type(pwInput, 'secret123')

  const roleSelect = screen.getByRole('combobox')
  await user.selectOptions(roleSelect, 'R_STUDENT')

  const mobileInput = screen.getByPlaceholderText('e.g. +1234567890')
  await user.clear(mobileInput)

  await user.click(saveButton)

  await waitFor(() => {
    expect(screen.queryByText(/User ID is required/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Email address is required/i)).not.toBeInTheDocument()
  })
})
