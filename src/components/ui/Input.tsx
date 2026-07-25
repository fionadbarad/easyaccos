'use client'

import { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export default function Input(props: InputProps) {
  return <input className="ui-input" {...props} />
}
