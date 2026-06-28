"use client"

import { useState } from "react"
import { NewsletterInput } from "@/components/core/NewsletterInput"

export function CTANewsletterWrapper() {
  const [email, setEmail] = useState("")

  const handleSubmit = () => {
    if (email) {
      console.log("Newsletter subscribe:", email)
      setEmail("")
    }
  }

  return (
    <NewsletterInput
      value={email}
      onChange={setEmail}
      onSubmit={handleSubmit}
    />
  )
}
