<?php

declare(strict_types=1);

namespace App\Twig\Components;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent('LiveCounter')]
final class LiveCounter
{
    use DefaultActionTrait;

    public int $count = 0;

    #[LiveAction]
    public function increment(): void
    {
        ++$this->count;
    }
}
