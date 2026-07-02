<?php

declare(strict_types=1);

namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent('Button')]
final class Button
{
    public string $label = 'Button';
    public string $variant = 'primary';
}
