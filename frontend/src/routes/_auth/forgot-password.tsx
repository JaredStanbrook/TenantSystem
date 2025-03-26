import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { createFileRoute } from '@tanstack/react-router'
import { Mail } from 'lucide-react'

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)

    try {
      // Here you would make an API call to request password reset
      // For demo purposes, we'll simulate a successful request
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setIsSuccess(true)
      toast('Reset Link Sent', {
        description: 'Check your email for instructions to reset your password',
      })
    } catch (error) {
      toast('Error', {
        description: 'Failed to send reset link. Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-center">
            {isSuccess
              ? "We've sent you an email with password reset instructions."
              : "Enter your email address and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-center text-sm text-gray-500">
                We've sent a password reset link to <strong>{email}</strong>.
                Please check your inbox and follow the instructions.
              </p>
              <p className="text-center text-xs text-gray-400">
                If you don't see the email, check your spam folder.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="flex flex-col items-center space-y-2">
            <Button variant="link" onClick={() => navigate({ to: '/login' })}>
              Return to login
            </Button>
            {!isSuccess && (
              <p className="text-xs text-gray-500">
                Remember your password?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs"
                  onClick={() => navigate({ to: '/login' })}
                >
                  Log in
                </Button>
              </p>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
