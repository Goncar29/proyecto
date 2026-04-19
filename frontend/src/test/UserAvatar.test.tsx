import { render, screen } from '@testing-library/react';
import UserAvatar from '@/components/UserAvatar';

describe('UserAvatar', () => {
  it('muestra la imagen cuando se provee photoUrl', () => {
    render(<UserAvatar name="Carlos González" photoUrl="https://example.com/photo.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(img).toHaveAttribute('alt', 'Carlos González');
  });

  it('muestra iniciales cuando no hay photoUrl', () => {
    render(<UserAvatar name="Carlos González" />);
    expect(screen.getByText('CG')).toBeInTheDocument();
  });

  it('muestra solo una inicial para nombre de una sola palabra', () => {
    render(<UserAvatar name="Carlos" />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('muestra máximo 2 iniciales para nombres con más de 2 palabras', () => {
    render(<UserAvatar name="Carlos Alberto González Pérez" />);
    expect(screen.getByText('CA')).toBeInTheDocument();
  });

  it('el span tiene aria-label con el nombre cuando no hay foto', () => {
    render(<UserAvatar name="María López" />);
    expect(screen.getByLabelText('María López')).toBeInTheDocument();
  });

  it('aplica clases de tamaño sm', () => {
    render(<UserAvatar name="Test User" size="sm" />);
    const avatar = screen.getByLabelText('Test User');
    expect(avatar.className).toContain('w-7');
    expect(avatar.className).toContain('h-7');
  });

  it('aplica clases de tamaño lg', () => {
    render(<UserAvatar name="Test User" size="lg" />);
    const avatar = screen.getByLabelText('Test User');
    expect(avatar.className).toContain('w-16');
    expect(avatar.className).toContain('h-16');
  });
});
