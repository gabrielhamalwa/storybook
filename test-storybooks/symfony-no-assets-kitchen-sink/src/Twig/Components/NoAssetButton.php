<?php

declare(strict_types=1);

namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent('NoAssetButton')]
final class NoAssetButton
{
    public string $label = 'Button';
}
